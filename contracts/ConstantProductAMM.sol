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
    event ADD_LIQUIDITY(address liquidityProvider, uint256 amountA, uint256 amountB, uint256 liquidityShares);

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
     * @notice math function to get square root of uint
     */
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @notice function returns lower value of inputs
     */
    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
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
            require(reserveA * _amountB == reserveB * _amountA, "ConstantProductAMM: Price manipulation detected");
        }
        // Mint liquidity shares
        // f(x, y) = balue of liquidity = _sqrt(xy)
        // s = dx / x * T = dy / y * T
        if (totalSupplyShares == 0) {
            liquidityShares = _sqrt(_amountA * _amountB);
        } else {
            liquidityShares = _min(
                (_amountA * totalSupplyShares) / reserveA,
                (_amountB * totalSupplyShares) / reserveB
            );
        }
        require(liquidityShares > 0, "ConstantProductAMM: No liquidity shares to mint");
        _mint(msg.sender, liquidityShares);
        // Update reserves of tokens
        _updateReserves(
            tokenA.balanceOf(address(this)),
            tokenB.balanceOf(address(this))
        );
        emit ADD_LIQUIDITY(msg.sender, _amountA, _amountB, liquidityShares);
    }

    /**
     * @notice user can remove liquidity and get back his tokens plus traiding fee
     */
    function removeLiquidity(uint256 _liquidityShares) external returns (uint256 amountA, uint256 amountB) {
        // Calculation of amountA and amountB to withdraw
        // dx = s / T * x
        // dy = s / T * y
        uint256 balA = tokenA.balanceOf(address(this));
        uint256 balB = tokenB.balanceOf(address(this));
        amountA = (_liquidityShares * balA) / totalSupplyShares;
        amountB = (_liquidityShares * balB) / totalSupplyShares;
        require(amountA > 0 && amountB > 0, "ConstantProductAMM: amountA or amountB == 0");
        // Burning of liquidity shares
        _burn(msg.sender, _liquidityShares);
        // Update reserves of tokens
        _updateReserves(
            balA - amountA,
            balB - amountB
        );
        // Transfer tokens back to liquidity provider
        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);
    }
}