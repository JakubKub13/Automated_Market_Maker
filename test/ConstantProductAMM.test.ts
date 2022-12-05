import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network } from "hardhat"
import { ConstantProductAMM, ConstantProductAMM__factory } from "../typechain-types";

const DAI_WHALE: string = "0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8";
const USDC_WHALE: string = "0xB60C61DBb7456f024f9338c739B02Be68e3F545C";

const TOKEN_A_ADDRESS: string = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"; // DAI polygon
const TOKEN_B_ADDRESS: string = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC polygon
const AMOUNT_DAI_TO_SEND = 1000n * 10n ** 18n // 1000 DAI
const AMOUNT_USDC_TO_SEND = 1000n * 10n ** 18n // 1000 USDC


describe("ConstantProductAMM", () => {
    let owner: SignerWithAddress;
    let acc1: SignerWithAddress;
    let acc2: SignerWithAddress;
    let daiWhale: SignerWithAddress;
    let usdcWhale: SignerWithAddress;
    let cAmmFactory: ConstantProductAMM__factory;
    let constantProductAMM: ConstantProductAMM;
    let dai: Contract;
    let usdc: Contract;


    beforeEach(async () => {
        [owner, acc1, acc2] = await ethers.getSigners();

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [DAI_WHALE]
        });

        dai = await ethers.getContractAt("IERC20", TOKEN_A_ADDRESS);
        daiWhale = await ethers.getSigner(DAI_WHALE);
        await dai.connect(daiWhale).transfer(owner.address, AMOUNT_DAI_TO_SEND);

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [USDC_WHALE]
        });

        usdc = await ethers.getContractAt("IERC20", TOKEN_B_ADDRESS);
        usdcWhale = await ethers.getSigner(USDC_WHALE);
        await usdc.connect(usdcWhale).transfer(owner.address, AMOUNT_USDC_TO_SEND);

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
        expect(_tokenB).to.eq("0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
    });

    it("Owner account should be funded on forked mainnet with DAI and USDC", async () => {
        const daiOwnerBal = await dai.balanceOf(owner.address);
        const usdcOwnerBal = await usdc.balanceOf(owner.address);
        console.log(`Dai balance of owner is: ${ethers.utils.formatEther(daiOwnerBal)}`);
        console.log(`USDC balance of owner is: ${ethers.utils.formatEther(usdcOwnerBal)}`);
    })
})