import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat"
import { AMMPool, AMMPool__factory } from  "../typechain-types"


describe("AMMPool", () => {
    it("Should work", async () => {
        const [owner, otherAccount]: SignerWithAddress[] = await ethers.getSigners();
        const ammPoolFactory: AMMPool__factory = await ethers.getContractFactory("AMMPool") ;
        const initialSupply: BigNumber = ethers.utils.parseUnits("20", 8);
        const slope: number = 1;
        const ammPool: AMMPool = await ammPoolFactory.deploy(initialSupply, slope);
        const tokenPrice: BigNumber = await ammPool.tokenPriceCalculation();
        console.log(ethers.utils.formatEther(tokenPrice))

        const stBuyTx = await ammPool.buy({ value: ethers.utils.parseEther("2") });
        await stBuyTx.wait();

     });
});