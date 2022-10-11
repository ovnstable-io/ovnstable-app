// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";

import "@overnight-contracts/connectors/contracts/stuff/KyberSwap.sol";
import "@overnight-contracts/connectors/contracts/stuff/Synapse.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";

import "hardhat/console.sol";

contract StrategyKyberSwapUsdcUsdt is Strategy {

    uint160 internal constant MIN_SQRT_RATIO = 79188560314459151373725315960; // TickMath.getSqrtRatioAtTick(-10)
    uint160 internal constant MAX_SQRT_RATIO = 79267784519130042428790663799; // TickMath.getSqrtRatioAtTick(10)

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public kncToken;

    IBasePositionManager public basePositionManager;
    IKyberSwapElasticLM public elasticLM;
    ReinvestmentToken public reinvestmentToken;
    uint256 public pid;

    IKyberPool public poolUsdcKnc;

    ISwap public synapseSwapRouter;
    uint24 public poolFeeUsdcUsdtInUnits;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;

    uint256 public tokenId;

    int24 public tickLower;
    int24 public tickUpper;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdcToken;
        address usdtToken;
        address kncToken;
        address basePositionManager;
        address elasticLM;
        address reinvestmentToken;
        uint256 pid;
        address synapseSwapRouter;
        address poolUsdcKnc;
        uint24 poolFeeUsdcUsdtInUnits;
        address oracleUsdc;
        address oracleUsdt;
        int24 tickLower;
        int24 tickUpper;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdcToken = IERC20(params.usdcToken);
        usdtToken = IERC20(params.usdtToken);
        kncToken = IERC20(params.kncToken);

        basePositionManager = IBasePositionManager(params.basePositionManager);
        elasticLM = IKyberSwapElasticLM(params.elasticLM);
        reinvestmentToken = ReinvestmentToken(params.reinvestmentToken);
        pid = params.pid;

        synapseSwapRouter = ISwap(params.synapseSwapRouter);
        poolUsdcKnc = IKyberPool(params.poolUsdcKnc);

        poolFeeUsdcUsdtInUnits = params.poolFeeUsdcUsdtInUnits;

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        tickLower = params.tickLower;
        tickUpper = params.tickUpper;

        usdcTokenDenominator = 10 ** IERC20Metadata(params.usdcToken).decimals();
        usdtTokenDenominator = 10 ** IERC20Metadata(params.usdcToken).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        _swapUsdcToUsdt();

        _addLiquidity();

        _depositToGauge();

    }

    function _swapUsdcToUsdt() internal {

        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        uint256 usdcBalance = usdcToken.balanceOf(address(this));

        uint256 needUsdt = _getNeedToByUsdt(usdcBalance - usdtBalance);

        SynapseLibrary.swap(
            synapseSwapRouter,
            address(usdcToken),
            address(usdtToken),
            needUsdt
        );

    }

    function _addLiquidity() internal {

        // add liquidity
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        usdcToken.approve(address(basePositionManager), usdcBalance);
        usdtToken.approve(address(basePositionManager), usdtBalance);

        if (tokenId == 0) {

            (int24 previousTickLower,) = reinvestmentToken.initializedTicks(tickLower);
            (int24 previousTickUpper,) = reinvestmentToken.initializedTicks(tickUpper);

            IBasePositionManager.MintParams memory params = IBasePositionManager.MintParams({
            token0 : address(usdcToken),
            token1 : address(usdtToken),
            fee : poolFeeUsdcUsdtInUnits,
            tickLower : tickLower,
            tickUpper : tickUpper,
            ticksPrevious : [previousTickLower, previousTickUpper],
            amount0Desired : usdcBalance,
            amount1Desired : usdtBalance,
            amount0Min : 0,
            amount1Min : 0,
            recipient : address(this),
            deadline : block.timestamp
            });

            (uint256 tokenIdGen,,,) = basePositionManager.mint(params);
            tokenId = tokenIdGen;
        } else {

            IBasePositionManager.IncreaseLiquidityParams memory params = IBasePositionManager.IncreaseLiquidityParams({
            tokenId : tokenId,
            amount0Desired : usdcBalance,
            amount1Desired : usdtBalance,
            amount0Min : 0,
            amount1Min : 0,
            deadline : block.timestamp
            });
            basePositionManager.addLiquidity(params);
        }

    }


    function _depositToGauge() internal {

        // 1. Deposit NFT to Farm Contract

        IERC721 nft = IERC721(address(basePositionManager));

        uint256[] memory nftIds = new uint256[](1);
        nftIds[0] = tokenId;

        if(nft.ownerOf(tokenId) != address(elasticLM)){
            nft.approve(address(elasticLM), tokenId);
            elasticLM.deposit(nftIds);
        }

        // 2. Stake available liquidity to Farm Pool
        (IBasePositionManager.Position memory pos,) = basePositionManager.positions(tokenId);
        uint256[] memory liqs = new uint256[](1);
        liqs[0] = pos.liquidity;

        elasticLM.join(pid, nftIds, liqs);
    }

    function _withdrawFromGauge(uint256 liquidity) internal {

        uint256[] memory nftIds = new uint256[](1);
        nftIds[0] = tokenId;
        uint256[] memory liqs = new uint256[](1);
        liqs[0] = liquidity;
        elasticLM.exit(pid, nftIds, liqs);
        elasticLM.withdraw(nftIds);
    }


    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 liquidity ,,) = elasticLM.getUserInfo(tokenId, pid);

        if(liquidity == 0){
            return 0;
        }

        // 1. Withdraw Liquidity and NFT from Gauge
        _withdrawFromGauge(liquidity);


        // 2. Unstake All liquidity from Pool
        IBasePositionManager.RemoveLiquidityParams memory params = IBasePositionManager.RemoveLiquidityParams({
            tokenId : tokenId,
            liquidity : uint128(liquidity),
            amount0Min : 0,
            amount1Min : 0,
            deadline : block.timestamp
        });

        basePositionManager.removeLiquidity(params);
        basePositionManager.transferAllTokens(address(usdcToken), 0, address(this));
        basePositionManager.transferAllTokens(address(usdtToken), 0, address(this));

        // 3. Swap all USDT to USDC
        uint256 usdtBalance = usdtToken.balanceOf(address(this));

        if (usdtBalance > 0) {
            SynapseLibrary.swap(
                synapseSwapRouter,
                address(usdtToken),
                address(usdcToken),
                usdtBalance
            );
        }

        return usdcToken.balanceOf(address(this));
    }


    function _getNeedToByUsdt(uint256 _amount) internal returns (uint256){

        (uint160 sqrtP, , ,) = reinvestmentToken.getPoolState();
        (uint128 baseL,,) = reinvestmentToken.getLiquidityState();

        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtP,
            MIN_SQRT_RATIO,
            MAX_SQRT_RATIO,
            baseL);

        uint256 needUsdtValue = (_amount * amountLiq1) / (amountLiq0 + amountLiq1);
        return needUsdtValue;
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 usdtBalance = usdtToken.balanceOf(address(this));

        if (tokenId > 0) {

            (IBasePositionManager.Position memory pos,) = basePositionManager.positions(tokenId);

            (uint160 sqrtP, , ,) = reinvestmentToken.getPoolState();

            uint160 sqrtUpper = TickMath.getSqrtRatioAtTick(pos.tickUpper);
            uint160 sqrtLower = TickMath.getSqrtRatioAtTick(pos.tickLower);
            usdcBalance += uint256(SqrtPriceMath.getAmount0Delta(sqrtP, sqrtUpper, int128(pos.liquidity)));
            usdtBalance += uint256(SqrtPriceMath.getAmount1Delta(sqrtLower, sqrtP, int128(pos.liquidity)));

            if (nav) {
                usdcBalance += ChainlinkLibrary.convertTokenToToken(
                    usdtBalance,
                    6,
                    6,
                    uint256(oracleUsdt.latestAnswer()),
                    uint256(oracleUsdc.latestAnswer())
                );
            } else {
                usdcBalance += SynapseLibrary.calculateSwap(
                    synapseSwapRouter,
                    address(usdtToken),
                    address(usdcToken),
                    usdtBalance
                );
            }

        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        (uint256 liquidity,,) = elasticLM.getUserInfo(tokenId, pid);

        if (liquidity > 0) {
            uint256[] memory nftIds = new uint256[](1);
            nftIds[0] = tokenId;

            uint256[] memory pIds = new uint256[](1);
            pIds[0] = pid;

            bytes[] memory datas = new bytes[](1);
            datas[0] = abi.encode(IKyberSwapElasticLM.HarvestData(pIds));
            elasticLM.harvestMultiplePools(nftIds, datas);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 kncBalance = kncToken.balanceOf(address(this));

        if (kncBalance > 0) {

            bool isFromToken0 = kncToken < usdcToken;

            IKyberPool.SwapCallbackData memory data = IKyberPool.SwapCallbackData({
                path: abi.encodePacked(address(kncToken), uint24(400), address(usdcToken)),
                source: address(this)
            });

            uint256 balanceUsdcBefore = usdcToken.balanceOf(address(this));

            poolUsdcKnc.swap(
                address(this),
                int256(kncBalance),
                isFromToken0,
                isFromToken0 ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1,
                new bytes(0)
            );

            uint256 balanceUsdcAfter = usdcToken.balanceOf(address(this));

            totalUsdc += balanceUsdcAfter - balanceUsdcBefore;

        }


        if (totalUsdc > 0) {
            usdcToken.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function swapCallback(
        int256 deltaQty0,
        int256 deltaQty1,
        bytes calldata data
    ) external {
        kncToken.transfer(address(poolUsdcKnc), uint256(deltaQty0));
    }

}
