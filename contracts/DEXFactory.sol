//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./ConstantProductAMM.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract DEXFactory is Ownable {
    mapping(address => bool) public isPairCreated;
    uint256 public ownerFeePool;
    uint256 public immutable createPairFee;

    event PairCreated(address tokenA, address tokenB, address createdPair);
    event FeeWthdrawal(address to, uint256 amount, unt256 time);

    constructor(uint256 _creationFee) {
        createPairFee = _creationFee;
    }

    function





}