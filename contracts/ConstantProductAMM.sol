//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConstantProductAMM{
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;
    // Vars to keep track how much tokenA and tokenB is in the contract
    // We need to keep the track of reserves to prevent users directly sends tokenA and tokenB to manupulate the balances -> swaps and liquidity shares mechanisms
    uint256 public reserveA;
    uint256 public reserveB;
    // Vars to keep track of totalSupplyShares and shares for user
    uint256 public totalSupplyShares;
    mapping(address => uint256) public sharesPerUser;

    event SWAP(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

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

    /**
     * @notice internal function to update state of reserves
     */
    function _updateReserves(uint256 _reserveA, uint256 _reserveB) private {
        reserveA = _reserveA;
        reserveB = _reserveB;
    }

    /**
     * @notice user can call this function to perform swap between tokenA and tokenB
     * @param _tokenIn => either tokenA or tokenB
     * @param _amountIn => amount of tokenA or tokenB which user is selling
     * @return amountOut => amount of tokenA or tokenB which is send to user after swap
     */
    function swap(address _tokenIn, uint256 _amountIn) external returns (uint256 amountOut) {
        require(_tokenIn == address(tokenA) || _tokenIn == address(tokenB), "ConstantProductAMM: Invalid token input");
        require(_amountIn > 0, "ConstantProductAMM: _amountIn can not be 0");
        // Pull token in
        bool isTokenA = _tokenIn == address(tokenA);
        (IERC20 tokenIn, IERC20 tokenOut, uint256 reserveIn, uint256 reserveOut) = isTokenA
            ? (tokenA, tokenB, reserveA, reserveB)
            : (tokenB, tokenA, reserveB, reserveA);
        tokenIn.transferFrom(msg.sender, address(this), _amountIn);
        // Calculate token out with fees, fee = 0.3 %
        // dy(amountOut) = ydx / (x + dx)
        uint256 amountInWithFee = (_amountIn * 997) / 1000;
        amountOut = (reserveOut * amountInWithFee) / (reserveIn * amountInWithFee);
        // Transfer token out to msg.sender
        tokenOut.transfer(msg.sender, amountOut);
        // Update the reserves of tokens
        _updateReserves(
            tokenA.balanceOf(address(this)),
            tokenB.balanceOf(address(this))
        );
        emit SWAP(_tokenIn, address(tokenOut), _amountIn, amountOut);
    }

    /**
     * @notice user can call this function to provide liquidity in tokenA and tokenB 
     * and earn fees
     */
    function addLiquidity(uint256 _amountA, uint256 _amountB) external returns (uint256 liquidityShares) {
        // Pull in tokenA and tokenB
        tokenA.transferFrom(msg.sender, address(this), _amountA);
        tokenB.transferFrom(msg.sender, address(this), _amountB);
        // we need to check the price of tokens has not changed yet to prevent manipulation
        // dy / dx = Y / X
        if (reserveA > 0 || reserveB > 0) {
            require(reserveA * _amountA == reserveB * _amountB, "ConstantProductAMM: Price manipulation detected");
        }
        // Mint liquidity shares
        // s = dx / x * T = dy / y * T
        
        // Update reserves of tokens
    }

    /**
     * @notice user can remove liquidity and get back his tokens plus traiding fee
     */
    function removeLiquidity() external {}
}