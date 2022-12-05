//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConstantProductAMM{
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;
    // Vars to keep track how much tokenA and tokenB is in the contract
    uint256 public reserveA;
    uint256 public reserveB;
    // Vars to keep track of totalSupplyShares and shares for user
    uint256 public totalSupplyShares;
    mapping(address => uint256) public sharesPerUser;

    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function _mint(address _to, uint256 _amount) private {
        sharesPerUser[_to] += _amount;
        totalSupplyShares += _amount;
    }

    function _burn(address _from, uint256 _amount) private {
        sharesPerUser[_from] -= _amount;
        totalSupplyShares -= _amount;
    }
}