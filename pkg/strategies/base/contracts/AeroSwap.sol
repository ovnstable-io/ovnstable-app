// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract SwapSimulatorAerodrome {

    error SlippageError(
        uint160 curSqrtRatio,
        uint160 minSqrtRatio,
        uint160 maxSqrtRatio        
    );

    struct SwapCallbackData {
        address tokenA;
        address tokenB;
        int24 tickSpacing;
    }

    struct SimulationParams {
        address strategy;
        address factory;
    }

    address strategy;
    address factory;

    function setSimulationParams(SimulationParams calldata params) external {
        strategy = params.strategy;
        factory = params.factory;
    }

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    ) public {

        ICLPool pool = ICLPool(pair);
        SwapCallbackData memory data = SwapCallbackData({
            tokenA: pool.token0(),
            tokenB: pool.token1(),
            tickSpacing: pool.tickSpacing()
        });

        IERC20(pool.token0()).transfer(msg.sender, IERC20(pool.token0()).balanceOf(msg.sender));

        uint160 maxSqrtRatio = uint160(79236085330515764027303304732); // 1.0002
        uint160 minSqrtRatio = uint160(79224201403219477170569942574); // 0.999 TODO: change for more strict slippage

        pool.swap(
            address(this), 
            zeroForOne, 
            int256(amountIn), 
            sqrtPriceLimitX96 == 0
                ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                : sqrtPriceLimitX96, 
            abi.encode(data)
        );

        (uint160 newSqrtRatioX96,,,,,) = pool.slot0();

        // if (newSqrtRatioX96 > maxSqrtRatio || newSqrtRatioX96 < minSqrtRatio) {
        //     revert SlippageError(
        //         newSqrtRatioX96,
        //         minSqrtRatio,
        //         maxSqrtRatio
        //     );
        // }
    }

    

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        CallbackValidation.verifyCallback(factory, data.tokenA, data.tokenB, data.tickSpacing);

        (bool isExactInput, uint256 amountToPay) =
            amount0Delta > 0
                ? (data.tokenA < data.tokenB, uint256(amount0Delta))
                : (data.tokenB < data.tokenA, uint256(amount1Delta));

        if (isExactInput) {
            IERC20(data.tokenA).transfer(msg.sender, amountToPay);
        } else {
            IERC20(data.tokenB).transfer(msg.sender, amountToPay);
        }
    }
}