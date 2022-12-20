import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network } from "hardhat";

const creationFee: Number = 0.01 // eth
const DAI_WHALE: string = "0xAEb2DAe192b2836735851Fd06a42aD04E7e99f3B";
const WETH_WHALE: string = "0x72A53cDBBcc1b9efa39c834A540550e23463AAcB";
const TOKEN_A_ADDRESS: string = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"; // DAI polygon
const TOKEN_B_ADDRESS: string = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"; // WETH polygon
const AMOUNT_DAI_TO_SEND: string = "1300" //1300 DAI
const AMOUNT_TETHER_TO_SEND: string = "1" // 1 WETH