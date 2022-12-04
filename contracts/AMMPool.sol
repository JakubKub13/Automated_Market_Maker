//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @notice Pool of a token with instant liquidity and price making mechanism
 */
contract AMMPool {
    using SafeMath for uint256;
    using SafeMath for uint32;

    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    // slope = how exponential price will be based on the supply of an asset
    uint32 slope;

    constructor(uint256 _initSupply, uint32 _slope) {
        totalSupply = _initSupply;
        slope = _slope;
    }

    function buy() public payable {
        require(msg.value > 0, "AMMPool: Can not buy any tokens for 0 ");
        uint256 amountToMint = buyingPriceCalculation(msg.value);
        totalSupply = totalSupply.add(amountToMint);
        uint256 currentBalance = balances[msg.sender];
        balances[msg.sender] = currentBalance.add(amountToMint);
    }

    function sell(uint256 _amountTokensToSell) public returns (uint256) {
        uint256 ethToReturn = 
    }

    function buyingPriceCalculation(uint256 _amountToDeposit) public view returns (uint256) {
        uint256 currentPrice = tokenPriceCalculation();
        return _amountToDeposit.div(currentPrice);
    }

    function sellingPriceCalculation(uint256)

    function tokenPriceCalculation() public view returns (uint256) {
        // We use it because of power func behavior in SOLIDITY
        uint256 tempVar = totalSupply.mul(totalSupply);
        // this should return token price
        return tempVar.mul(slope);
    }

}