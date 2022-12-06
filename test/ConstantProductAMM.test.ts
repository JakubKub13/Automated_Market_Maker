import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai";
import { exec } from "child_process";
import exp from "constants";
import { BigNumber, BigNumberish, Contract } from "ethers";
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

        it("")
    });
})