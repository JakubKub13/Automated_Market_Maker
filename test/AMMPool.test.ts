import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat"
import { AMMPool, AMMPool__factory } from  "../typechain-types"
describe("AMMPool", () => {
    it("Should work", async () => {
        const [owner, otherAccount]: SignerWithAddress[] = await ethers.getSigners();
        const ammPoolFactory: AMMPool__factory = await ethers.getContractFactory("AMMPool") ;
        const initialSupply: number = 100
        const slope: number = 1
        const ammPool: AMMPool = await ammPoolFactory.deploy(100, 1)
    });
});