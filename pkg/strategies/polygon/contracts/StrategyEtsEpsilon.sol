// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "./interfaces/IHedgeExchanger.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";


contract StrategyEtsEpsilon is Strategy {

    // --- params

    IERC20 public usdc;
    IERC20 public dai;

    IERC20 public rebaseToken;
    IHedgeExchanger public hedgeExchanger;

    ISwapRouter public uniswapV3Router;
    uint24 public poolUsdcDaiFee;

    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdc;

    uint256 public allowedSlippageBp;

    uint256 daiDm;
    uint256 usdcDm;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address rebaseToken;
        address hedgeExchanger;
        address uniswapV3Router;
        uint24 poolUsdcDaiFee;
        address oracleDai;
        address oracleUsdc;
        uint256 allowedSlippageBp;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        dai = IERC20(params.dai);

        rebaseToken = IERC20(params.rebaseToken);
        hedgeExchanger = IHedgeExchanger(params.hedgeExchanger);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolUsdcDaiFee = params.poolUsdcDaiFee;

        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdc = IPriceFeed(params.oracleUsdc);

        allowedSlippageBp = params.allowedSlippageBp;

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdc), "Some token not compatible");

        // swap usdc to dai
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdcToDai(_amount), allowedSlippageBp);
        uint256 daiAmount = UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(usdc),
            address(dai),
            poolUsdcDaiFee,
            address(this),
            _amount,
            daiMinAmount
        );

        // buy
        uint256 daiBalance = dai.balanceOf(address(this));
        dai.approve(address(hedgeExchanger), daiBalance);
        hedgeExchanger.buy(daiBalance, "");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        // add for unstake more than requested
        uint256 rebaseTokenAmount = OvnMath.addBasisPoints(_oracleUsdcToDai(_amount) + 10, allowedSlippageBp);
        // get allowed balance for unstake full (need less 99%)
        uint256 rebaseTokenBalance = OvnMath.subBasisPoints(rebaseToken.balanceOf(address(this)), 101);
        if (rebaseTokenAmount > rebaseTokenBalance) {
            rebaseTokenAmount = rebaseTokenBalance;
        }

        // redeem
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenAmount);
        hedgeExchanger.redeem(rebaseTokenAmount);

        // swap dai to usdc
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), allowedSlippageBp);
        uint256 usdcAmount = UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(dai),
            address(usdc),
            poolUsdcDaiFee,
            address(this),
            daiBalance,
            usdcMinAmount
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        // get allowed balance for unstake full (need less 99%)
        uint256 rebaseTokenBalance = OvnMath.subBasisPoints(rebaseToken.balanceOf(address(this)), 101);

        // redeem
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenBalance);
        hedgeExchanger.redeem(rebaseTokenBalance);

        // swap dai to usdc
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), allowedSlippageBp);
        uint256 usdcAmount = UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(dai),
            address(usdc),
            poolUsdcDaiFee,
            address(this),
            daiBalance,
            usdcMinAmount
        );

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this)) + rebaseToken.balanceOf(address(this));

        if (daiBalance > 0) {
            if (nav) {
                usdcBalance += _oracleDaiToUsdc(daiBalance);
            } else {
                usdcBalance += OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), allowedSlippageBp);
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }

}
