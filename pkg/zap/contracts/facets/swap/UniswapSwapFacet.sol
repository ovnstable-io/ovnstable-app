//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";
import "../../interfaces/core/ISwapFacet.sol";
import "../../interfaces/IMasterFacet.sol";
import "../../interfaces/Constants.sol";

contract UniswapSwapFacet is ISwapFacet, Modifiers {
    address constant WETH = 0x4200000000000000000000000000000000000006;

    struct SwapCallbackData {
        address tokenA;
        address tokenB;
        int24 tickSpacing;
    }

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    ) public onlyDiamond {
        IMasterFacet master = IMasterFacet(address(this));
        (address token0Address, address token1Address) = master.getPoolTokens(pair);
        int24 tickSpacing = master.getTickSpacing(pair);
        SwapCallbackData memory data = SwapCallbackData({
            tokenA: token0Address,
            tokenB: token1Address,
            tickSpacing: tickSpacing
        });

        ICLPool(pair).swap(
            address(this), 
            zeroForOne, 
            int256(amountIn), 
            sqrtPriceLimitX96 == 0
                ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                : sqrtPriceLimitX96, 
            abi.encode(data)
        );
    }

    function simulateSwap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        int24[] memory tickRange
    ) external onlyDiamond {
        IMasterFacet master = IMasterFacet(address(this));
        (address token0Address, address token1Address) = master.getPoolTokens(pair);

        swap(pair, amountIn, sqrtPriceLimitX96, zeroForOne);

        uint256[] memory ratio = new uint256[](2);
        (ratio[0], ratio[1]) = master.getProportion(pair, tickRange);
        revert SwapError(
            IERC20(token0Address).balanceOf(address(this)),
            IERC20(token1Address).balanceOf(address(this)),
            ratio[0],
            ratio[1]
        );
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        address factory = INonfungiblePositionManager(LibCoreStorage.coreStorage().npm).factory();
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