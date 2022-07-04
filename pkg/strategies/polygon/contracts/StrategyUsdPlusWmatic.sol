// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./connectors/dystopia/interfaces/IDystopiaRouter.sol";
import "./connectors/dystopia/interfaces/IDystopiaLP.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";
import "./connectors/aave/interfaces/IPool.sol";
import "./connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "./connectors/penrose/interface/IUserProxy.sol";
import "./connectors/penrose/interface/IPenLens.sol";
import "./libraries/WadRayMath.sol";
import "./interfaces/IExchange.sol";
import "./core/HedgeStrategy.sol";

import {AaveBorrowLibrary} from "./libraries/AaveBorrowLibrary.sol";
import {OvnMath} from "./libraries/OvnMath.sol";
import {DystopiaLibrary} from "./libraries/DystopiaLibrary.sol";


import "hardhat/console.sol";

contract StrategyUsdPlusWmatic is HedgeStrategy {
    using WadRayMath for uint256;

    uint8 public constant E_MODE_CATEGORY_ID = 0;
    uint256 public constant INTEREST_RATE_MODE = 2;
    uint16 public constant REFERRAL_CODE = 0;
    uint256 constant BASIS_POINTS_FOR_STORAGE = 100; // 1%
    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 4; // 0.04%
    uint256 constant MAX_UINT_VALUE = type(uint256).max;

    IExchange public exchange;

    IERC20 public usdPlus;
    IERC20 public usdc;
    IERC20 public aUsdc;
    IERC20 public wmatic;
    IERC20 public dyst;

    uint256 public usdcDm;
    uint256 public wmaticDm;

    IDystopiaRouter public dystRouter;
    IDystopiaLP public dystRewards;
    IDystopiaLP public dystVault;


    IERC20 public penToken;
    IUserProxy public penProxy;
    IPenLens public penLens;


    // Aave
    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleWmatic;

    uint256 public usdcStorage;

    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public balancingDelta;
    uint256 public realHealthFactor;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }



    function setTokens(
        address _usdc,
        address _aUsdc,
        address _wmatic,
        address _usdPlus,
        address _penToken,
        address _dyst
    ) external onlyAdmin {
        usdc = IERC20(_usdc);
        aUsdc = IERC20(_aUsdc);
        wmatic = IERC20(_wmatic);
        usdcDm = 10 ** IERC20Metadata(_usdc).decimals();
        wmaticDm = 10 ** IERC20Metadata(_wmatic).decimals();

        usdPlus = IERC20(_usdPlus);
        setAsset(_usdPlus);

        penToken = IERC20(_penToken);
        dyst = IERC20(_dyst);

    }


    function setParams(
        address _exchanger,
        address _dystRewards,
        address _dystVault,
        address _dystRouter,
        address _penProxy,
        address _penLens
    ) external onlyAdmin {

        dystRewards = IDystopiaLP(_dystRewards);
        dystVault = IDystopiaLP(_dystVault);
        dystRouter = IDystopiaRouter(_dystRouter);

        penProxy = IUserProxy(_penProxy);
        penLens = IPenLens(_penLens);

        exchange = IExchange(_exchanger);
    }

    function setAaveParams(
        address _aavePoolAddressesProvider,
        address _oracleUsdc,
        address _oracleWmatic,
        uint256 _liquidationThreshold,
        uint256 _healthFactor,
        uint256 _balancingDelta
    ) external onlyAdmin {

        aavePoolAddressesProvider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        oracleUsdc = IPriceFeed(_oracleUsdc);
        oracleWmatic = IPriceFeed(_oracleWmatic);

        liquidationThreshold = _liquidationThreshold * 10 ** 15;
        healthFactor = _healthFactor * 10 ** 15;
        realHealthFactor = 0;
        balancingDelta = _balancingDelta * 10 ** 15;
    }

    function _stake(uint256 _amount) internal override  {

        _borrowWmatic();
        _stakeDystopiaToPenrose();
    }


    function _unstake(
        uint256 _amount
    ) internal override returns (uint256) {

        uint256 amount = _amount + ((_amount * exchange.redeemFee()) / exchange.redeemFeeDenominator()) ;

        (uint256 reserveWmatic, uint256 reserveUsdPlus,) = dystVault.getReserves();

        uint256 wmaticBorrow = AaveBorrowLibrary.getBorrowForWithdraw(
            amount,
            reserveUsdPlus,
            reserveWmatic,
            liquidationThreshold,
            healthFactor,
            usdcDm,
            wmaticDm,
            uint256(oracleUsdc.latestAnswer()),
            uint256(oracleWmatic.latestAnswer())
        );

        IPool aave = _aavePool();
        (, uint256 borrow,,,,) = aave.getUserAccountData(address(this));
        uint256 wmaticBorrowNative = AaveBorrowLibrary.convertUsdToTokenAmount(borrow, wmaticDm, uint256(oracleWmatic.latestAnswer()));

        uint256 borrowAmount;
        uint256 getUsdc;

        if (wmaticBorrow > wmaticBorrowNative) {
            borrowAmount = wmaticBorrowNative;
            getUsdc = MAX_UINT_VALUE;
        } else {
            borrowAmount = wmaticBorrow;
            getUsdc = amount - (wmaticBorrow * reserveUsdPlus) / reserveWmatic;
        }

        uint256 amountLp = _getLiquidityForToken(borrowAmount);
        penProxy.unstakeLpAndWithdraw(address(dystVault), amountLp);
        dystVault.approve(address(dystRouter), amountLp);
        _removeLiquidity(amountLp);


        wmatic.approve(address(aave), wmatic.balanceOf(address(this)));
        aave.repay(address(wmatic), wmatic.balanceOf(address(this)), INTEREST_RATE_MODE, address(this));
        aave.withdraw(address(usdc), getUsdc, address(this));

        usdc.approve(address(exchange), usdc.balanceOf(address(this)));
        exchange.buy(address(usdc), usdc.balanceOf(address(this)));

        _showBalances();
        return usdPlus.balanceOf(address(this));
    }


    function _removeLiquidity(uint256 amountLp) internal {

        (uint256 amountLiq0, uint256 amountLiq1) = _getLiquidity( amountLp);
        (uint256 amount0, uint256 amount1) = dystRouter.removeLiquidity(
            address(wmatic),
            address(usdPlus),
            false,
            amountLp,
            (amountLiq0 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq0, BASIS_POINTS_FOR_SLIPPAGE),
            (amountLiq1 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq1, BASIS_POINTS_FOR_SLIPPAGE),
            address(this),
            block.timestamp + 600
        );

    }


    function _stakeDystopiaToPenrose() internal {


        // 1. Stake to Dystopia
        uint256 usdPlusAmount = usdPlus.balanceOf(address(this));
        uint256 wmaticAmount = wmatic.balanceOf(address(this));

        usdPlus.approve(address(dystRouter), usdPlusAmount);
        wmatic.approve(address(dystRouter), wmaticAmount);

        dystRouter.addLiquidity(
            address(wmatic),
            address(usdPlus),
            false,
            wmaticAmount,
            usdPlusAmount,
            (wmaticAmount < 10000) ? 0 : OvnMath.subBasisPoints(wmaticAmount, BASIS_POINTS_FOR_SLIPPAGE),
            (usdPlusAmount < 10000) ? 0 : OvnMath.subBasisPoints(usdPlusAmount, BASIS_POINTS_FOR_SLIPPAGE),
            address(this),
            block.timestamp + 600
        );

        // 2. Stake to Penrose
        uint256 lpTokenBalance = dystVault.balanceOf(address(this));
        dystVault.approve(address(penProxy), lpTokenBalance);
        penProxy.depositLpAndStake(address(dystVault), lpTokenBalance);
    }

    function _borrowWmatic() internal {

        (uint256 reserveWmatic, uint256 reserveUsdPlus,) = dystVault.getReserves();

        uint256 balanceUsdPlus = usdPlus.balanceOf(address(this));
        uint256 redeemFeeAmount = (balanceUsdPlus * exchange.redeemFee()) / exchange.redeemFeeDenominator();
        balanceUsdPlus = balanceUsdPlus - redeemFeeAmount;

        // 1. Recalculate target amount and increese usdcStorage proportionately.
        uint256 amount = OvnMath.subBasisPoints(balanceUsdPlus - usdcStorage, BASIS_POINTS_FOR_STORAGE);
        usdcStorage = balanceUsdPlus - amount;

        (uint256 usdcCollateral, uint256 wmaticBorrow) = AaveBorrowLibrary.getCollateralAndBorrowForSupplyAndBorrow(
            balanceUsdPlus,
            reserveUsdPlus,
            reserveWmatic,
            liquidationThreshold,
            healthFactor,
            usdcDm,
            wmaticDm,
            uint256(oracleUsdc.latestAnswer()),
            uint256(oracleWmatic.latestAnswer())
        );


        uint256 redeemUsdcCollateral = usdcCollateral + (usdcCollateral * exchange.redeemFee()) / exchange.redeemFeeDenominator() + 100;
        exchange.redeem(address(usdc), redeemUsdcCollateral);

        IPool aavePool = _aavePool();

        usdc.approve(address(aavePool), usdcCollateral);
        aavePool.supply(address(usdc), usdcCollateral, address(this), REFERRAL_CODE);
        aavePool.borrow(address(wmatic), wmaticBorrow, INTEREST_RATE_MODE, REFERRAL_CODE, address(this));
    }

    function _aavePool() internal returns (IPool aavePool){
        aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), E_MODE_CATEGORY_ID));
    }


    function _showAave() internal {

        IPool aave = _aavePool();

        (uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor) = aave.getUserAccountData(address(this));


        console.log('---AAVE---');
        console.log('totalCollateralBase:         %s', totalCollateralBase);
        console.log('totalDebtBase:               %s', totalDebtBase);
        console.log('availableBorrowsBase:        %s', availableBorrowsBase);
        console.log('currentLiquidationThreshold: %s', currentLiquidationThreshold);
        console.log('ltv:                         %s', ltv);
        console.log('healthFactor:                %s', healthFactor);
        console.log('');

    }

    function _showBalances() internal {
        console.log('---Balances---');
        console.log('USDC     %s', usdc.balanceOf(address(this)));
        console.log('USD+     %s', usdPlus.balanceOf(address(this)));
        console.log('WMATIC   %s', wmatic.balanceOf(address(this)));
        console.log('Dystopia %s', dystVault.balanceOf(address(this)));

        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystVault));
        uint256 lpTokenBalance = IERC20(stakingAddress).balanceOf(userProxyThis);

        console.log('Penrose %s', lpTokenBalance);

    }

    function netAssetValue() external view override returns (uint256){

        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystVault));
        uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);

        if (balanceLp == 0)
            return 0;

        (uint256 poolWmatic, uint256 poolUsdPlus) = _getLiquidity(balanceLp);
        uint256 totalUsdPlus = poolUsdPlus;
        uint256 totalUsdc = usdc.balanceOf(address(this)) + aUsdc.balanceOf(address(this));


        // debt base (USD) convert to Wmatic amount
        (, uint256 debtBase,,,,) = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider))).getUserAccountData(address(this));
        uint256 aaveWmatic = AaveBorrowLibrary.convertUsdToTokenAmount(debtBase, wmaticDm, uint256(oracleWmatic.latestAnswer()));

        if (aaveWmatic < poolWmatic) {
            uint256 deltaWmatic = poolWmatic - aaveWmatic;
            totalUsdc += AaveBorrowLibrary.convertTokenAmountToTokenAmount(
                deltaWmatic,
                wmaticDm,
                usdcDm,
                uint256(oracleWmatic.latestAnswer()),
                uint256(oracleUsdc.latestAnswer())
            );

        } else {
            uint256 deltaWmatic = aaveWmatic - poolWmatic;
            totalUsdc -= AaveBorrowLibrary.convertTokenAmountToTokenAmount(
                deltaWmatic,
                wmaticDm,
                usdcDm,
                uint256(oracleWmatic.latestAnswer()),
                uint256(oracleUsdc.latestAnswer())
            );
        }

        return totalUsdPlus + totalUsdc;
    }

    function _getLiquidity(uint256 balanceLp) public view returns (uint256, uint256) {
        (uint256 amount0Current, uint256 amount1Current,) = dystVault.getReserves();

        uint256 amountLiq0 = amount0Current * balanceLp / dystVault.totalSupply();
        uint256 amountLiq1 = amount1Current * balanceLp / dystVault.totalSupply();
        return (amountLiq0, amountLiq1);
    }


    function _getLiquidityForToken(uint256 token0Borrow) public view returns (uint256) {
        (uint256 amount0, uint256 amount1,) = dystVault.getReserves();
        uint256 amountLp = token0Borrow * dystVault.totalSupply() / amount0;
        return amountLp;
    }



    function _claimRewards(address _to) internal override returns (uint256){

        // claim rewards
        penProxy.claimStakingRewards();

        // sell rewards
        uint256 totalUsdc = 0;

        uint256 dystBalance = dyst.balanceOf(address(this));
        if (dystBalance > 0) {
            uint256 dystUsdc = DystopiaLibrary._swapExactTokensForTokens(
                dystRouter,
                address(dyst),
                address(wmatic),
                address(usdc),
                false,
                false,
                dystBalance,
                address(this)
            );
            totalUsdc += dystUsdc;
        }

        uint256 penBalance = penToken.balanceOf(address(this));
        if (penBalance > 0) {
            uint256 penUsdc = DystopiaLibrary._swapExactTokensForTokens(
                dystRouter,
                address(penToken),
                address(wmatic),
                address(usdc),
                false,
                false,
                penBalance,
                address(this)
            );
            totalUsdc += penUsdc;
        }

        return totalUsdc;
    }


    function _balance() internal override returns (uint256) {

        IPool aave = _aavePool();
        (,,,,,uint256 healthFactorCurrent) = aave.getUserAccountData(address(this));

        if (healthFactorCurrent > 10 ** 20 || OvnMath.abs(healthFactorCurrent, healthFactor) < balancingDelta) {
            return healthFactorCurrent;
        }

        if (healthFactorCurrent > healthFactor) {

        } else {
        }

        return healthFactorCurrent;

    }
}
