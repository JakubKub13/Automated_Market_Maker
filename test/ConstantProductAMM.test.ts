import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ethers } from "hardhat"
import { ConstantProductAMM, ConstantProductAMM__factory } from "../typechain-types";

describe("ConstantProductAMM", () => {
    let owner: SignerWithAddress;
    let acc1: SignerWithAddress;
    let acc2: SignerWithAddress;
    let cAmmFactory: ConstantProductAMM__factory;
    let constantProductAMM: ConstantProductAMM;
    const tokenAaddr: string = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"; // DAI polygon
    const tokenBaddr: string = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC polygon
    

    beforeEach(async () => {
        [owner, acc1, acc2] = await ethers.getSigners();
        cAmmFactory = await ethers.getContractFactory("ConstantProductAMM");
        constantProductAMM = await cAmmFactory.deploy(
            tokenAaddr,
            tokenBaddr
        );
        await constantProductAMM.deployed();
    })
})