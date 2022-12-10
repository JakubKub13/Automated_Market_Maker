import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network } from "hardhat"
import { ConstantProductAMM, ConstantProductAMM__factory } from "../typechain-types";

const DAI_WHALE: string = "0xAEb2DAe192b2836735851Fd06a42aD04E7e99f3B";
const WETH_WHALE: string = "0x72A53cDBBcc1b9efa39c834A540550e23463AAcB";
const TOKEN_A_ADDRESS: string = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"; // DAI polygon
const TOKEN_B_ADDRESS: string = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"; // WETH polygon
const AMOUNT_DAI_TO_SEND: string = "1300" //1300 DAI
const AMOUNT_TETHER_TO_SEND: string = "1" // 1 WETH



describe("ConstantProductAMM", () => {
    let owner: SignerWithAddress;
    let acc1: SignerWithAddress;
    let acc2: SignerWithAddress;
    let daiWhale: SignerWithAddress;
    let wethWhale: SignerWithAddress;
    let cAmmFactory: ConstantProductAMM__factory;
    let constantProductAMM: ConstantProductAMM;
    let dai: Contract;
    let weth: Contract;


    beforeEach(async () => {
        [owner, acc1, acc2] = await ethers.getSigners();

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [DAI_WHALE]
        });

        dai = await ethers.getContractAt("IERC20", TOKEN_A_ADDRESS);
        daiWhale = await ethers.getSigner(DAI_WHALE);
        await dai.connect(daiWhale).transfer(owner.address, ethers.utils.parseEther(AMOUNT_DAI_TO_SEND));

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [WETH_WHALE]
        });

        weth = await ethers.getContractAt("IERC20", TOKEN_B_ADDRESS);
        wethWhale = await ethers.getSigner(WETH_WHALE);
        await weth.connect(wethWhale).transfer(owner.address, ethers.utils.parseEther(AMOUNT_TETHER_TO_SEND));

        cAmmFactory = await ethers.getContractFactory("ConstantProductAMM");
        constantProductAMM = await cAmmFactory.deploy(
            TOKEN_A_ADDRESS,
            TOKEN_B_ADDRESS
        );
        await constantProductAMM.deployed();
    })

    it("Should deploy without errors", async () => {
        let _tokenA = await constantProductAMM.tokenA();
        let _tokenB = await constantProductAMM.tokenB();
        expect(_tokenA).to.eq("0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        expect(_tokenB).to.eq("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");
    });

    it("Owner account should be funded on forked mainnet with DAI and Wrapped ETHER", async () => {
        const daiOwnerBal:BigNumber = await dai.balanceOf(owner.address);
        const wethOwnerBal:BigNumber = await weth.balanceOf(owner.address);
        expect(ethers.utils.formatEther(daiOwnerBal)).to.eq("1300.0");
        expect(ethers.utils.formatEther(wethOwnerBal)).to.eq("1.0")
    });

    describe("Test Swapping funcionality", () => {
        beforeEach(async () => {
            const sendDaiTx = await dai.connect(owner).transfer(acc1.address, ethers.utils.parseEther("100"));
            await sendDaiTx.wait();
            const sendWethTx = await weth.connect(owner).transfer(acc1.address, ethers.utils.parseEther("0.1"));
            await sendWethTx.wait();
        });

        it("Account 1 should be funded on mainnet fork from owner", async () => {
            const acc1BalDAI:BigNumber = await dai.balanceOf(acc1.address);
            expect(ethers.utils.formatEther(acc1BalDAI)).to.eq("100.0");
            const acc1BalWeth:BigNumber = await weth.balanceOf(acc1.address);
            expect(ethers.utils.formatEther(acc1BalWeth)).to.eq("0.1");
        });

        it("Should be able to add liquidity and receive liquidity tokens", async () => {
            const daiLiquidity:BigNumber = await dai.balanceOf(owner.address);
            const wethLiquidity: BigNumber = await weth.balanceOf(owner.address);

            const balanceOfWethBefore: BigNumber = await weth.balanceOf(owner.address);
            const balanceOfDaiBefore: BigNumber = await dai.balanceOf(owner.address);

            console.log(`Balance of weth in owner address before adding liquidity is : ${ethers.utils.formatEther(balanceOfWethBefore)}`);
            console.log(`Balance of dai in owner address before adding liquidity is :${ethers.utils.formatEther(balanceOfDaiBefore)}`);
            expect(ethers.utils.formatEther(balanceOfDaiBefore)).to.eq("1200.0");
            expect(ethers.utils.formatEther(balanceOfWethBefore)).to.eq("0.9");


            const approveDAITx = await dai.approve(constantProductAMM.address, daiLiquidity);
            await approveDAITx.wait();
            const approveWethTx = await weth.approve(constantProductAMM.address, wethLiquidity);
            await approveWethTx.wait();

            const addLiquidityTx = await constantProductAMM.addLiquidity(daiLiquidity, wethLiquidity);
            await addLiquidityTx.wait();

            const liquidityTokensOwner = await constantProductAMM.sharesPerUser(owner.address);
            console.log(ethers.utils.formatEther(liquidityTokensOwner));

            const balanceOfWethAfter: BigNumber = await weth.balanceOf(owner.address);
            const balanceOfDaiAfter: BigNumber = await dai.balanceOf(owner.address);

            console.log(`Balance of weth in owner address before adding liquidity is :${ethers.utils.formatEther(balanceOfWethAfter)}`);
            console.log(`Balance of dai in owner address before adding liquidity is :${ethers.utils.formatEther(balanceOfDaiAfter)}`);

            expect(ethers.utils.formatEther(balanceOfDaiBefore)).to.eq("1200.0");
            expect(ethers.utils.formatEther(balanceOfWethBefore)).to.eq("0.9");
            expect(Number(ethers.utils.formatEther(liquidityTokensOwner))).to.be.greaterThan(0);
        });

        it("Should add liquidity Swap tokens, update reserves and remove Liquidity with earned fees", async () => {
            console.log("--------------------------------------------------------------------------------------------------------");
            const daiLiquidity:BigNumber = await dai.balanceOf(owner.address);
            const wethLiquidity: BigNumber = await weth.balanceOf(owner.address);
            console.log(`Balances of owner when providing liquidity are ${ethers.utils.formatEther(daiLiquidity)} DAI and ${ethers.utils.formatEther(wethLiquidity)} WETH`);
            console.log("--------------------------------------------------------------------------------------------------------");

            const approveDAITx = await dai.approve(constantProductAMM.address, daiLiquidity);
            await approveDAITx.wait();
            const approveWethTx = await weth.approve(constantProductAMM.address, wethLiquidity);
            await approveWethTx.wait();

            const addLiquidityTx = await constantProductAMM.addLiquidity(daiLiquidity, wethLiquidity);
            await addLiquidityTx.wait();

            const balanceOfWethAcc1: BigNumber = await weth.balanceOf(acc1.address);
            const balanceOfDAIAcc1: BigNumber = await dai.balanceOf(acc1.address);
            console.log(`Balance of WETH of account1 ${ethers.utils.formatEther(balanceOfWethAcc1)}`);
            console.log(`Balance of DAI of account1 is ${ethers.utils.formatEther(balanceOfDAIAcc1)}`);
            console.log("--------------------------------------------------------------------------------------------------------");
            expect(ethers.utils.formatEther(balanceOfWethAcc1)).to.eq("0.1");
            expect(ethers.utils.formatEther(balanceOfDAIAcc1)).to.eq("100.0");

            const reserveDaiBeforeSwap: BigNumber = await constantProductAMM.reserveA();
            const reserveWethBeforeSwap: BigNumber = await constantProductAMM.reserveB();
            console.log(`Reserve of DAI tokens in contract has: ${ethers.utils.formatEther(reserveDaiBeforeSwap)} DAI tokens`);
            console.log(`Reserve of WETH tokens in contract has: ${ethers.utils.formatEther(reserveWethBeforeSwap)} WETH tokens`);
            console.log("--------------------------------------------------------------------------------------------------------");
            expect(ethers.utils.formatEther(reserveDaiBeforeSwap)).to.eq("1200.0");
            expect(ethers.utils.formatEther(reserveWethBeforeSwap)).to.eq("0.9");

            const amountToSwap: string = "50" // 50 Dai for Weth
            const approveSwapTx = await dai.connect(acc1).approve(constantProductAMM.address, ethers.utils.parseEther(amountToSwap));
            await approveSwapTx.wait()
            const swapTx = await constantProductAMM.connect(acc1).swap(dai.address, ethers.utils.parseEther(amountToSwap));
            await swapTx.wait();

            const balanceOfWethAcc1AfterSwap: BigNumber = await weth.balanceOf(acc1.address);
            const balanceOfDAIAcc1AfterSwap: BigNumber = await dai.balanceOf(acc1.address);
            console.log(`Balance of WETH of account1 after swap is ${ethers.utils.formatEther(balanceOfWethAcc1AfterSwap)}`);
            console.log(`Balance of DAI of account1 after swap is ${ethers.utils.formatEther(balanceOfDAIAcc1AfterSwap)}`);
            console.log("--------------------------------------------------------------------------------------------------------");
            expect(ethers.utils.formatEther(balanceOfWethAcc1AfterSwap)).to.eq("0.135896307556906828");
            expect(ethers.utils.formatEther(balanceOfDAIAcc1AfterSwap)).to.eq("50.0");

            const reserveDaiAfterSwap: BigNumber = await constantProductAMM.reserveA();
            const reserveWethAfterSwap: BigNumber = await constantProductAMM.reserveB();
            console.log(`Reserve of DAI tokens in contract has: ${ethers.utils.formatEther(reserveDaiAfterSwap)} DAI tokens`);
            console.log(`Reserve of WETH tokens in contract has: ${ethers.utils.formatEther(reserveWethAfterSwap)} WETH tokens`);
            console.log("--------------------------------------------------------------------------------------------------------");
            expect(ethers.utils.formatEther(reserveDaiAfterSwap)).to.eq("1250.0");
            expect(ethers.utils.formatEther(reserveWethAfterSwap)).to.eq("0.864103692443093172");

            const approveSwapTx2 = await dai.connect(acc1).approve(constantProductAMM.address, ethers.utils.parseEther(amountToSwap));
            await approveSwapTx2.wait()
            const swapTx2 = await constantProductAMM.connect(acc1).swap(dai.address, ethers.utils.parseEther(amountToSwap));
            await swapTx2.wait();

            const balanceOfWethAcc1AfterSwap2: BigNumber = await weth.balanceOf(acc1.address);
            const balanceOfDAIAcc1AfterSwap2: BigNumber = await dai.balanceOf(acc1.address);
            console.log(`Balance of WETH of account1 after swap 2 is ${ethers.utils.formatEther(balanceOfWethAcc1AfterSwap2)}`);
            console.log(`Balance of DAI of account1 after swap 2 is ${ethers.utils.formatEther(balanceOfDAIAcc1AfterSwap2)}`);
            console.log("--------------------------------------------------------------------------------------------------------");
            expect(ethers.utils.formatEther(balanceOfWethAcc1AfterSwap2)).to.eq("0.16903518440291844");
            expect(ethers.utils.formatEther(balanceOfDAIAcc1AfterSwap2)).to.eq("0.0");

            const reserveDaiAfterSwap2: BigNumber = await constantProductAMM.reserveA();
            const reserveWethAfterSwap2: BigNumber = await constantProductAMM.reserveB();
            console.log(`Reserve of DAI tokens in contract has: ${ethers.utils.formatEther(reserveDaiAfterSwap2)} DAI tokens`);
            console.log(`Reserve of WETH tokens in contract has: ${ethers.utils.formatEther(reserveWethAfterSwap2)} WETH tokens`);
            console.log("--------------------------------------------------------------------------------------------------------");
            expect(ethers.utils.formatEther(reserveDaiAfterSwap2)).to.eq("1300.0");
            expect(ethers.utils.formatEther(reserveWethAfterSwap2)).to.eq("0.83096481559708156");

            const wethAmountToSwap = "0.16903518440291844";
            const approveSwapTx3 = await weth.connect(acc1).approve(constantProductAMM.address, ethers.utils.parseEther(wethAmountToSwap));
            await approveSwapTx3.wait();
            const swapTx3 = await constantProductAMM.connect(acc1).swap(weth.address, ethers.utils.parseEther(wethAmountToSwap));
            await swapTx3.wait();

            const balanceOfWethAcc1AfterSwap3: BigNumber = await weth.balanceOf(acc1.address);
            const balanceOfDAIAcc1AfterSwap3: BigNumber = await dai.balanceOf(acc1.address);
            console.log(`Balance of WETH of account1 after swap 2 is ${ethers.utils.formatEther(balanceOfWethAcc1AfterSwap3)}`);
            console.log(`Balance of DAI of account1 after swap 2 is ${ethers.utils.formatEther(balanceOfDAIAcc1AfterSwap3)}`);
            console.log("--------------------------------------------------------------------------------------------------------");
            expect(ethers.utils.formatEther(balanceOfWethAcc1AfterSwap3)).to.eq("0.0");
            expect(ethers.utils.formatEther(balanceOfDAIAcc1AfterSwap3)).to.eq("219.197658854678154938");

            const liquidityShares = await constantProductAMM.sharesPerUser(owner.address);
            console.log(`Liquidity provider has ${ethers.utils.formatEther(liquidityShares)} LP tokens`);
            console.log("--------------------------------------------------------------------------------------------------------");
            expect(Number(ethers.utils.formatEther(liquidityShares))).to.be.greaterThan(0);

            const removeLiquidityTx = await constantProductAMM.removeLiquidity(liquidityShares);
            await removeLiquidityTx.wait();

            const liquiditySharesAfterRemove = await constantProductAMM.sharesPerUser(owner.address);
            expect(Number(ethers.utils.formatEther(liquiditySharesAfterRemove))).to.eq(0);

            const daiAfterRemoveLiq:BigNumber = await dai.balanceOf(owner.address);
            const wethAfterRemoveLiq: BigNumber = await weth.balanceOf(owner.address);
            console.log(`Balances of owner after removing liquidity are ${ethers.utils.formatEther(daiAfterRemoveLiq)} DAI and ${ethers.utils.formatEther(wethAfterRemoveLiq)} WETH`);
            console.log("--------------------------------------------------------------------------------------------------------");
            // 1333 DAIs = 1 weth -----> 1200 + 1200 -> 2400 value in DAI together before providing liquidity
            // After removing liquidity -> 1333 + 1080.80 -> 2413 value in DAI together after removing liquidity

            const reserveDaiAfterRemove: BigNumber = await constantProductAMM.reserveA();
            const reserveWethAfterRemove: BigNumber = await constantProductAMM.reserveB();
            console.log(`Reserve of DAI tokens in contract has: ${ethers.utils.formatEther(reserveDaiAfterRemove)} DAI tokens`);
            console.log(`Reserve of WETH tokens in contract has: ${ethers.utils.formatEther(reserveWethAfterRemove)} WETH tokens`);
            expect(Number(ethers.utils.formatEther(reserveDaiAfterRemove))).to.eq(0);
            expect(Number(ethers.utils.formatEther(reserveWethAfterRemove))).to.eq(0);
        });
    });

    describe("Trying to manipulate constant product formula", () => {
        beforeEach(async () => {
            const sendDaiTx = await dai.connect(owner).transfer(acc1.address, ethers.utils.parseEther("100"));
            await sendDaiTx.wait();
            const sendWethTx = await weth.connect(owner).transfer(acc1.address, ethers.utils.parseEther("0.1"));
            await sendWethTx.wait();
            const sendDaiTx2 = await dai.connect(owner).transfer(acc2.address, ethers.utils.parseEther("100"));
            await sendDaiTx2.wait();
            const sendWethTx2 = await weth.connect(owner).transfer(acc2.address, ethers.utils.parseEther("0.1"));
            await sendWethTx2.wait();

            const daiLiquidity:BigNumber = await dai.balanceOf(owner.address);
            const wethLiquidity: BigNumber = await weth.balanceOf(owner.address);
            const approveDAITx = await dai.approve(constantProductAMM.address, daiLiquidity);
            await approveDAITx.wait();
            const approveWethTx = await weth.approve(constantProductAMM.address, wethLiquidity);
            await approveWethTx.wait();
            const addLiquidityTx = await constantProductAMM.addLiquidity(daiLiquidity, wethLiquidity);
            await addLiquidityTx.wait(); 
        });

        it("Should not be able to manipulate the constant product formula", async () => {
            const reserveOfDAI: BigNumber = await constantProductAMM.reserveA();
            const reserveWeth: BigNumber = await constantProductAMM.reserveB();
            expect(ethers.utils.formatEther(reserveOfDAI)).to.eq("1100.0");
            expect(ethers.utils.formatEther(reserveWeth)).to.eq("0.8");

            const daiLiquidity2: string = "50";
            const wethLiquidity2: string = "0.1";
            const parsedLiquidDAI: BigNumber = ethers.utils.parseEther(daiLiquidity2);
            const parsedLiquityWeth: BigNumber = ethers.utils.parseEther(wethLiquidity2);

            const daiApproveTx = await dai.connect(acc2).approve(constantProductAMM.address, parsedLiquidDAI);
            await daiApproveTx.wait();
            const wethApproveTx = await weth.connect(acc2).approve(constantProductAMM.address, parsedLiquityWeth);
            await wethApproveTx.wait();

            await expect(constantProductAMM.connect(acc2).addLiquidity(parsedLiquidDAI, parsedLiquityWeth)).to.be.revertedWith("ConstantProductAMM: Price manipulation detected")
        });

        it("Should be able to add only liquidity that fits defined constant product formula", async () => {
            const reserveOfDAI: BigNumber = await constantProductAMM.reserveA();
            const reserveWeth: BigNumber = await constantProductAMM.reserveB();
            expect(ethers.utils.formatEther(reserveOfDAI)).to.eq("1100.0");
            expect(ethers.utils.formatEther(reserveWeth)).to.eq("0.8");

            const daiLiquidity2: string = "11";
            const wethLiquidity2: string = "0.008";
            const parsedLiquidDAI: BigNumber = ethers.utils.parseEther(daiLiquidity2);
            const parsedLiquityWeth: BigNumber = ethers.utils.parseEther(wethLiquidity2);

            const daiApproveTx = await dai.connect(acc2).approve(constantProductAMM.address, parsedLiquidDAI);
            await daiApproveTx.wait();
            const wethApproveTx = await weth.connect(acc2).approve(constantProductAMM.address, parsedLiquityWeth);
            await wethApproveTx.wait();

            await expect(constantProductAMM.connect(acc2).addLiquidity(parsedLiquidDAI, parsedLiquityWeth)).to.emit(constantProductAMM, "ADD_LIQUIDITY");
        });
    });

    describe("Testing unexpected behavior", () => {
        beforeEach(async () => {
            await weth.connect(wethWhale).transfer(acc2.address, ethers.utils.parseEther(AMOUNT_TETHER_TO_SEND));
            await dai.connect(daiWhale).transfer(acc2.address, ethers.utils.parseEther(AMOUNT_DAI_TO_SEND));
        });

        it("Should fund acc2 with DAI and WETH", async () => {
            const balanceDAIAcc2: BigNumber = await dai.balanceOf(acc2.address);
            const balanceWETHAcc2: BigNumber = await weth.balanceOf(acc2.address);
            expect(Number(ethers.utils.formatEther(balanceDAIAcc2))).to.eq(1300);
            expect(Number(ethers.utils.formatEther(balanceWETHAcc2))).to.eq(1);
        });

        it("Should test what happens when acc2 swap for all of the liquidity of one token and LP want withdraw", async () => {
            console.log("--------------------------------------------------------------------------------------------------------");
            const daiLiquidity:BigNumber = await dai.balanceOf(owner.address);
            const wethLiquidity: BigNumber = await weth.balanceOf(owner.address);
            console.log(`Balances of owner when providing liquidity are ${ethers.utils.formatEther(daiLiquidity)} DAI and ${ethers.utils.formatEther(wethLiquidity)} WETH`);
            console.log("--------------------------------------------------------------------------------------------------------");

            const approveDAITx = await dai.approve(constantProductAMM.address, daiLiquidity);
            await approveDAITx.wait();
            const approveWethTx = await weth.approve(constantProductAMM.address, wethLiquidity);
            await approveWethTx.wait();

            const addLiquidityTx = await constantProductAMM.addLiquidity(daiLiquidity, wethLiquidity);
            await addLiquidityTx.wait();

            const reserveDaiBeforeSwap: BigNumber = await constantProductAMM.reserveA();
            const reserveWethBeforeSwap: BigNumber = await constantProductAMM.reserveB();
            console.log(`Reserve of DAI tokens in contract has: ${ethers.utils.formatEther(reserveDaiBeforeSwap)} DAI tokens`);
            console.log(`Reserve of WETH tokens in contract has: ${ethers.utils.formatEther(reserveWethBeforeSwap)} WETH tokens`);
            console.log("--------------------------------------------------------------------------------------------------------");
            expect(Number(ethers.utils.formatEther(reserveDaiBeforeSwap))).to.eq(1300.0);
            expect(Number(ethers.utils.formatEther(reserveWethBeforeSwap))).to.eq(1);

            const balanceDAIAcc2: BigNumber = await dai.balanceOf(acc2.address);
            console.log(`Amount account 2 is going to swap is ${ethers.utils.formatEther(balanceDAIAcc2)} DAI`);

            const apprTx = await dai.connect(acc2).approve(constantProductAMM.address, balanceDAIAcc2);
            await apprTx.wait();

            const swapTx = await constantProductAMM.connect(acc2).swap(dai.address, balanceDAIAcc2);
            await swapTx.wait();

            const reserveDAIafterSwap: BigNumber = await constantProductAMM.reserveA();
            const reserveWETHafterSwap: BigNumber = await constantProductAMM.reserveB();

            console.log(`DAI reserve in contract after swap is ${ethers.utils.formatEther(reserveDAIafterSwap)}`);
            console.log(`WETH reserve in contract after swap is ${ethers.utils.formatEther(reserveWETHafterSwap)}`);

            const balanceDAIacc2After: BigNumber = await dai.balanceOf(acc2.address);
            const balanceWETHacc2After: BigNumber = await weth.balanceOf(acc2.address);

            console.log(`Balance of account 2 after swap is ${ethers.utils.formatEther(balanceDAIacc2After)} DAI`);
            console.log(`Balance of account 2 after swap is ${ethers.utils.formatEther(balanceWETHacc2After)} WETH `);

            expect(ethers.utils.formatEther(balanceDAIacc2After)).to.eq("0");
        });
    });
});


