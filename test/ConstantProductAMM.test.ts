import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network } from "hardhat"
import { ConstantProductAMM, ConstantProductAMM__factory } from "../typechain-types";

const DAI_WHALE: string = "0xAEb2DAe192b2836735851Fd06a42aD04E7e99f3B";
const TETHER_WHALE: string = "0x9bdB521a97E95177BF252C253E256A60C3e14447";

const TOKEN_A_ADDRESS: string = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"; // DAI polygon
const TOKEN_B_ADDRESS: string = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // TETHER polygon
const AMOUNT_DAI_TO_SEND = "1000" //1000 DAI
const AMOUNT_TETHER_TO_SEND = "1000" // 1000 TETHER


describe("ConstantProductAMM", () => {
    let owner: SignerWithAddress;
    let acc1: SignerWithAddress;
    let acc2: SignerWithAddress;
    let daiWhale: SignerWithAddress;
    let tetherWhale: SignerWithAddress;
    let cAmmFactory: ConstantProductAMM__factory;
    let constantProductAMM: ConstantProductAMM;
    let dai: Contract;
    let tether: Contract;


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
            params: [TETHER_WHALE]
        });

        tether = await ethers.getContractAt("IERC20", TOKEN_B_ADDRESS);
        tetherWhale = await ethers.getSigner(TETHER_WHALE);
        await tether.connect(tetherWhale).transfer(owner.address, ethers.utils.parseUnits(AMOUNT_TETHER_TO_SEND, 6));

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

    it("Owner account should be funded on forked mainnet with DAI and TETHER", async () => {
        const daiOwnerBal = await dai.balanceOf(owner.address);
        const tetherOwnerBal = await tether.balanceOf(owner.address);
        expect(ethers.utils.formatEther(daiOwnerBal)).to.eq("1000.0");
        expect(ethers.utils.formatUnits(tetherOwnerBal, 6)).to.eq("1000.0")
    });
})