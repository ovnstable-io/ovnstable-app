//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IPoolMathFacet {
    function toUint160(uint256 y) external view returns (uint160);

    function mulDiv(uint256 a, uint256 b, uint256 denominator) external view returns (uint256);

    function getTickAtSqrtRatio(uint160 sqrtPriceX96) external view returns (int24);

    function getSqrtRatioAtTick(int24 tick) external view returns (uint160);

    function getPoolDecimals(address pair) external view returns (uint256, uint256);

    function getPoolSqrtRatioX96(address pair) external view returns (uint160);

    function getPoolTickSpacing(address pair) external view returns (int24);

    function getPoolTick(address pair) external view returns (int24);

    function getPoolTokens(address pair) external view returns (address, address);

    // function getLiquidity(address pair) external view returns (uint128);

    function getLiquidityForAmounts(
        uint160 sqrtRatioX96,
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 amount0,
        uint256 amount1
    ) external view returns (uint128);

    function getAmountsForLiquidity(
        uint160 sqrtRatioX96,
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint128 liquidity
    ) external view returns (uint256, uint256);

    // function estimateAmount0(
    //     uint256 amount1,
    //     uint128 liquidity,
    //     uint160 sqrtRatioX96,
    //     int24 tickLow,
    //     int24 tickHigh
    // ) external pure returns (uint256);

    // function estimateAmount1(
    //     uint256 amount0,
    //     uint128 liquidity,
    //     uint160 sqrtRatioX96,
    //     int24 tickLow,
    //     int24 tickHigh
    // ) external pure returns (uint256);

    // function getNextSqrtPriceFromAmounts(
    //     uint160 sqrtPriceX96,
    //     uint128 liquidity,
    //     uint256 amount0,
    //     uint256 amount1,
    //     bool direction // true = add amount0, remove amount1, false = remove amount0, add amount1
    // ) external pure returns (uint160);
}
