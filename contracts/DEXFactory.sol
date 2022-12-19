//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ConstantProductAMM}  from "./ConstantProductAMM.sol";


contract DEXFactory is Ownable {
    mapping(address => mapping(address => bool)) public isPairCreated;
    uint256 public ownerFeePool;
    uint256 public immutable createPairFee;

    event PairCreated(address tokenA, address tokenB, ConstantProductAMM createdPair);
    event FeeWthdrawal(address to, uint256 amount, uint256 time);

    constructor(uint256 _creationFee) {
        createPairFee = _creationFee;
    }

    function createPair(address tokenA, address tokenB) external payable returns (ConstantProductAMM) {
        require(isPairCreated[tokenA][tokenB] == false && isPairCreated[tokenB][tokenA] == false, "DEXFactory: This tokens already has pair created");
        ownerFeePool += msg.value;
        ConstantProductAMM newPair = new ConstantProductAMM(tokenA, tokenB);
        isPairCreated[tokenA][tokenB] = true;
        isPairCreated[tokenB][tokenA] = true;
        emit PairCreated(tokenA, tokenB, newPair);
        return newPair;
    }





}