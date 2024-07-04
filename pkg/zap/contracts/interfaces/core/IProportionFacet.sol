//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IProportionFacet {
    struct InputSwapToken {
        address tokenAddress;
        uint256 amount;
        uint256 price;
    }

    struct ResultOfProportion {
        address[] inputTokenAddresses;
        uint256[] inputTokenAmounts;
        address[] outputTokenAddresses;
        uint256[] outputTokenProportions;
        uint256[] outputTokenAmounts;
        uint256[] poolProportionsUsd;
    }

    struct OutTokenInfo {
        uint256 idx;
        uint256 amountUsd;
        uint256 prop;
        uint256 propAmount;
        uint256 amountToSwap;
        uint256 outAmount;
        address token;
    }

    function getProportion(
        address pair,
        int24[] memory tickRange
    ) external view returns (uint256 token0Amount, uint256 token1Amount);

    function getProportionForZap(
        address pair,
        int24[] memory tickRange,
        InputSwapToken[] memory inputTokens
    ) external view returns (ResultOfProportion memory);
}
