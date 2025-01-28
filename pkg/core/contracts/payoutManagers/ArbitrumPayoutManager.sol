import '../PayoutManager.sol';
import { IV3SwapRouter, IPancakeV3Pool, IQuoterV2 } from '@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol';
import { IUniswapV3Pool } from '@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol';
import { PancakeSwapV3Library } from '@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol';
import { DistributionCreator, CampaignParameters } from '@overnight-contracts/connectors/contracts/stuff/Angle.sol';

error UnsupportedToken();
error UnsupportedPool();

contract ArbitrumPayoutManager is PayoutManager {
    address public constant PANCAKE_ROUTER = 0x32226588378236Fd0c7c4053999F88aC0e5cAc77;
    address public constant QUOTER_V2 = 0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997;
    address public constant DISTRIBUTION_CREATOR = 0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd;
    address public constant USD_PLUS = 0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65;
    address public constant USDT_PLUS = 0xb1084db8D3C05CEbd5FA9335dF95EE4b8a0edc30;
    address public constant OVN = 0xA3d1a8DEB97B111454B294E2324EfAD13a9d8396;
    address public constant CL_OVN = address(0x714D48cb99b87F274B33A89fBb16EaD191B40b6C); // CL-OVN/USD+
    address public constant CL_USDT = address(0x8a06339Abd7499Af755DF585738ebf43D5D62B94); // CL-USDT+/USD+

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __PayoutManager_init();
    }

    function arbitrum() external {}

    function _custom(NonRebaseInfo memory info, Item memory item) internal override {
        if (keccak256(bytes(item.dexName)) == keccak256(bytes('Uniswap'))) {
            _customUniswap(info, item);
        }
    }

    function _customUniswap(NonRebaseInfo memory info, Item memory item) internal {
        IERC20 token = IERC20(item.token);
        uint256 amountToken = info.amount;

        if (amountToken > 0) {
            if (item.feePercent > 0) {
                uint256 feeAmount = (amountToken * item.feePercent) / 100;
                amountToken -= feeAmount;
                if (feeAmount > 0) {
                    token.transfer(item.feeReceiver, feeAmount);
                    emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, feeAmount, item.feeReceiver);
                }
            }
            if (amountToken > 0) {
                if (_calculateSwapAmountOut(item.token, amountToken) <= (_getRewardTokenMinAmount(OVN) / 3600) * 86400) {
                    IERC20(item.token).transfer(item.feeReceiver, amountToken);
                    emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, amountToken, item.feeReceiver);
                    return;
                } else {
                    uint256 ovnAmount = _swapTokensPancakeV3(item.token, OVN, amountToken);
                    if (ovnAmount > 0) {
                        _createMerkleCampaign(ovnAmount, OVN, item.pool);
                        emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, OVN, ovnAmount, item.to);
                    }
                }
            }
        }
    }

    function _swapTokensPancakeV3(address tokenIn, address tokenOut, uint256 amountIn) internal returns (uint256) {
        if (tokenIn != USD_PLUS && tokenIn != USDT_PLUS) {
            revert UnsupportedToken();
        }

        uint24 fee0 = IPancakeV3Pool(CL_OVN).fee();
        uint24 fee1 = IPancakeV3Pool(CL_USDT).fee();

        return
            tokenIn == USD_PLUS
                ? PancakeSwapV3Library.singleSwap(PANCAKE_ROUTER, tokenIn, tokenOut, fee0, address(this), amountIn, 0)
                : PancakeSwapV3Library.multiSwap(PANCAKE_ROUTER, tokenIn, USD_PLUS, tokenOut, fee0, fee1, address(this), amountIn, 0);
    }

    function _createMerkleCampaign(uint256 amount, address token, address pool) internal returns (bytes32) {
        DistributionCreator distributionCreator = DistributionCreator(DISTRIBUTION_CREATOR);

        CampaignParameters memory params = _prepareCampaignParameters(amount, token, pool);

        IERC20(token).approve(DISTRIBUTION_CREATOR, amount);
        distributionCreator.acceptConditions();

        return distributionCreator.createCampaign(params);
    }

    function _prepareCampaignParameters(uint256 amount, address token, address pool) internal view returns (CampaignParameters memory) {
        address token0 = IUniswapV3Pool(pool).token0();
        address token1 = IUniswapV3Pool(pool).token1();

        (uint256 token0Percent, uint256 token1Percent, uint256 fee) = _getPoolParameters(token0, token1);

        uint32 startTimestamp = _calculateStartTimestamp();

        return
            CampaignParameters({
                campaignId: bytes32(0),
                creator: address(this),
                rewardToken: token,
                amount: amount,
                campaignType: 2,
                startTimestamp: startTimestamp,
                duration: 86400,
                campaignData: abi.encode(pool, fee, token0Percent, token1Percent, 0, address(0), 0, new address[](0), new address[](0), '0x')
            });
    }

    function _getPoolParameters(address token0, address token1) internal pure returns (uint256 token0Percent, uint256 token1Percent, uint256 fee) {
        if (token0 == USD_PLUS || token0 == USDT_PLUS) {
            return (6500, 0, 3500);
        } else if (token1 == USD_PLUS || token1 == USDT_PLUS) {
            return (0, 6500, 3500);
        }
        revert UnsupportedPool();
    }

    function _calculateStartTimestamp() internal view returns (uint32) {
        if (block.timestamp % 1 days < 12 hours) {
            return uint32((block.timestamp / 1 days) * 1 days + 12 hours);
        }
        return uint32((block.timestamp / 1 days + 1) * 1 days + 12 hours);
    }

    function _getRewardTokenMinAmount(address token) internal view returns (uint256) {
        return DistributionCreator(DISTRIBUTION_CREATOR).rewardTokenMinAmounts(token);
    }

    function _calculateSwapAmountOut(address tokenIn, uint256 amountIn) internal returns (uint256) {
        if (tokenIn != USD_PLUS && tokenIn != USDT_PLUS) {
            revert UnsupportedToken();
        }

        if (tokenIn == USD_PLUS) {
            uint24 fee = IPancakeV3Pool(CL_OVN).fee();
            return PancakeSwapV3Library.quoteSingleSwap(QUOTER_V2, tokenIn, OVN, fee, amountIn);
        } else {
            uint24 fee0 = IPancakeV3Pool(CL_OVN).fee();
            uint24 fee1 = IPancakeV3Pool(CL_USDT).fee();
            return PancakeSwapV3Library.quoteMultiSwap(QUOTER_V2, tokenIn, USD_PLUS, OVN, fee1, fee0, amountIn);
        }
    }
}
