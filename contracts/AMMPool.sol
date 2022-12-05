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

    function sell(uint256 _amountTokensToSell) public {
        require(balances[msg.sender] >= _amountTokensToSell && _amountTokensToSell > 0, "AMMPool: Can not sell 0 tokens");
        totalSupply = totalSupply.sub(_amountTokensToSell);
        uint256 balanceAcc = balances[msg.sender];
        balances[msg.sender] = balanceAcc.sub(_amountTokensToSell);
        uint256 ethToReturn = sellingPriceCalculation(_amountTokensToSell);
        require(address(this).balance >= ethToReturn, "AMMPool: Not enough ETH in pool to sent");
        payable(msg.sender).transfer(ethToReturn);

    }

    function buyingPriceCalculation(uint256 _amountToDeposit) public view returns (uint256) {
        uint256 currentPrice = tokenPriceCalculation();
        return _amountToDeposit.div(currentPrice);
    }

    function sellingPriceCalculation(uint256 _amountToSell) public view returns (uint256) {
        uint256 currentPrice = tokenPriceCalculation();
        return _amountToSell.mul(currentPrice);
    }

    function tokenPriceCalculation() public view returns (uint256) {
        // We use it because of power func behavior in SOLIDITY
        uint256 tempVar = totalSupply.mul(totalSupply);
        // this should return token price
        return tempVar.mul(slope);
    }

}