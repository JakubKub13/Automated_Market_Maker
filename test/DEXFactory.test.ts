import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network } from "hardhat";
import { DEXFactory, DEXFactory__factory } from "../typechain-types";

const creationFee: string = "0.01" // eth
const DAI_WHALE: string = "0xAEb2DAe192b2836735851Fd06a42aD04E7e99f3B";
const WETH_WHALE: string = "0x72A53cDBBcc1b9efa39c834A540550e23463AAcB";
const TOKEN_A_ADDRESS: string = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"; // DAI polygon
const TOKEN_B_ADDRESS: string = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"; // WETH polygon
const AMOUNT_DAI_TO_SEND: string = "1300" //1300 DAI
const AMOUNT_TETHER_TO_SEND: string = "1" // 1 WETH

describe("DEXFactory", async () => {
    let owner: SignerWithAddress;
    let acc1: SignerWithAddress;
    let daiWhale: SignerWithAddress;
    let wethWhale: SignerWithAddress;
    let DEXFactoryFac: DEXFactory__factory;
    let dexFactory: DEXFactory;
    let dai: Contract;
    let weth: Contract;

    beforeEach(async () => {
        [owner, acc1] = await ethers.getSigners();

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [DAI_WHALE]
        });

        dai = await ethers.getContractAt("IERC20", TOKEN_A_ADDRESS);
        daiWhale = await ethers.getSigner(DAI_WHALE);
        await dai.connect(daiWhale).transfer(acc1.address, ethers.utils.parseEther(AMOUNT_DAI_TO_SEND));

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [WETH_WHALE]
        });

        weth = await ethers.getContractAt("IERC20", TOKEN_B_ADDRESS);
        wethWhale = await ethers.getSigner(WETH_WHALE);
        await weth.connect(wethWhale).transfer(acc1.address, ethers.utils.parseEther(AMOUNT_TETHER_TO_SEND));

        DEXFactoryFac = await ethers.getContractFactory("DEXFactory")
        dexFactory = await DEXFactoryFac.deploy(ethers.utils.parseEther(creationFee));
    });

    it("Should deploy without errors", async () => {
        let createPairFeeBn: BigNumber = await dexFactory.createPairFee();
        console.log(`Creation pair fee is set to be: ${ethers.utils.formatEther(createPairFeeBn)}`);
        let creationFee = ethers.utils.formatEther(createPairFeeBn);
        expect(Number(creationFee)).to.eq(0.01);
    });

    it("Should be able to create instance of Pair", async () => {
        const pair = await dexFactory.connect(acc1).createPair(
            TOKEN_A_ADDRESS,
            TOKEN_B_ADDRESS,
            {value: ethers.utils.parseEther(creationFee)}
            );
        //await createPairTx.wait();
        console.log(pair)

    });

    it("Owner should be able to withdraw from ownerFeePool", async () => {

    });

    it("Should not be able to create the pair for tokens that already has pair created", async () => {

    });
})