// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/IPriceFeed.sol";
import "../connectors/aave/interfaces/IPool.sol";
import "../connectors/arrakis/IArrakisVault.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../StrategyArrakisWmatic.sol";
import "./OvnMath.sol";
import "./AaveBorrowLibrary.sol";

library StrategyArrakisWmaticLibrary {

    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 1000; // 10%
    uint256 constant BASIS_POINTS_FOR_STORAGE = 100; // 1%

    function _getLiquidityForToken(StrategyArrakisWmatic self, uint256 token0Borrow) public view returns (uint256) {
        (, uint256 amount1Current) = _getUnderlyingBalances(self);
        uint256 amountLp = token0Borrow * self.arrakisVault().totalSupply() / amount1Current;
        return amountLp;
    }

    function _getTokensForLiquidity(StrategyArrakisWmatic self, uint256 balanceLp) public view returns (uint256, uint256) {
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances(self);

        uint256 amountLiq0 = amount0Current * balanceLp / self.arrakisVault().totalSupply();
        uint256 amountLiq1 = amount1Current * balanceLp / self.arrakisVault().totalSupply();
        return (self.usdcTokenInversion() == 0) ? (amountLiq0, amountLiq1) : (amountLiq0, amountLiq1);
    }

    function _getUnderlyingBalances(StrategyArrakisWmatic self) public view returns (uint256, uint256) {
        (uint256 amount0, uint256 amount1) = self.arrakisVault().getUnderlyingBalances();
        return (self.usdcTokenInversion() == 0) ? (amount0, amount1) : (amount1, amount0);
    }




    function _addLiquidityAndStakeWithSlippage(StrategyArrakisWmatic self, uint256 usdcAmount, uint256 token0Amount) public {
        if (usdcAmount != 0) {
            self.usdcToken().approve(address(self.arrakisRouter()), usdcAmount);
        }
        if (token0Amount != 0) {
            self.token0().approve(address(self.arrakisRouter()), token0Amount);
        }
        if (self.usdcTokenInversion() == 0) {
            self.arrakisRouter().addLiquidityAndStake(
                address(self.arrakisRewards()),
                usdcAmount,
                token0Amount,
                (usdcAmount == 0) ? 0 : OvnMath.subBasisPoints(usdcAmount, BASIS_POINTS_FOR_SLIPPAGE),
                (token0Amount == 0) ? 0 : OvnMath.subBasisPoints(token0Amount, BASIS_POINTS_FOR_SLIPPAGE),
                address(self)
            );
        } else {
            self.arrakisRouter().addLiquidityAndStake(
                address(self.arrakisRewards()),
                token0Amount,
                usdcAmount,
                (token0Amount == 0) ? 0 : OvnMath.subBasisPoints(token0Amount, BASIS_POINTS_FOR_SLIPPAGE),
                (usdcAmount == 0) ? 0 : OvnMath.subBasisPoints(usdcAmount, BASIS_POINTS_FOR_SLIPPAGE),
                address(self)
            );
        }
    }

    function _removeLiquidityAndUnstakeWithSlippage(StrategyArrakisWmatic self, uint256 amountLp) public returns (uint256, uint256) {
        (uint256 amountLiq0, uint256 amountLiq1) = _getTokensForLiquidity(self, amountLp);
        (uint256 amount0, uint256 amount1,) = self.arrakisRouter().removeLiquidityAndUnstake(
            address(self.arrakisRewards()),
            amountLp,
            0,//(amountLiq0 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq0, BASIS_POINTS_FOR_SLIPPAGE),
            0,//(amountLiq1 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq1, BASIS_POINTS_FOR_SLIPPAGE),
            address(self)
        );

        return (self.usdcTokenInversion() == 0) ? (amount0, amount1) : (amount1, amount0);
    }


    function _healthFactorBalanceI(StrategyArrakisWmatic self) public returns (uint256) {

        IPool aavePool = _aavePoolEm(self);
        (,,,,,uint256 healthFactorCurrent) = aavePool.getUserAccountData(address(self));

        if (healthFactorCurrent > 10 ** 20 || OvnMath.abs(healthFactorCurrent, self.healthFactor()) < self.balancingDelta()) {
            return healthFactorCurrent;
        }

        if (healthFactorCurrent > self.healthFactor()) {
            _healthFactorBalanceILt(self);
        } else {
            _healthFactorBalanceIGt(self);
        }

        (,,,,, healthFactorCurrent) = aavePool.getUserAccountData(address(self));
        return healthFactorCurrent;
    }

    function _healthFactorBalanceILt(StrategyArrakisWmatic self) internal {
        IPool aavePool = _aavePoolEm(self);

        (uint256 collateral, uint256 borrow,,,,) = aavePool.getUserAccountData(address(self));
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances(self);

        AaveBorrowLibrary.GetWithdrawAmountForBalanceParams memory params = AaveBorrowLibrary.GetWithdrawAmountForBalanceParams(
            collateral,
            borrow,
            amount0Current,
            amount1Current,
            self.liquidationThreshold(),
            self.healthFactor(),
            self.usdcTokenDenominator(),
            self.token0Denominator(),
            uint256(self.oracleChainlinkUsdc().latestAnswer()),
            uint256(self.oracleChainlinkToken0().latestAnswer())
        );

        if (amount0Current == 0) {
            uint256 neededToken0 = AaveBorrowLibrary.getBorrowIfZeroAmountForBalance(params);
            aavePool.borrow(address(self.token0()), neededToken0, self.interestRateMode(), self.referralCode(), address(self));
            self.token0().approve(address(self.arrakisRouter()), neededToken0);
            _addLiquidityAndStakeWithSlippage(self, 0, neededToken0);
            return;
        }

        uint256 neededUsdc = AaveBorrowLibrary.getWithdrawAmountForBalance(
            params
        );
        aavePool.withdraw(address(self.usdcToken()), neededUsdc, address(self));
        (params.totalCollateralUsd, params.totalBorrowUsd,,,,) = aavePool.getUserAccountData(address(self));
        uint256 neededToken0 = AaveBorrowLibrary.getBorrowIfZeroAmountForBalance(params);
        aavePool.borrow(address(self.token0()), neededToken0, self.interestRateMode(), self.referralCode(), address(self));
        self.usdcToken().approve(address(self.arrakisRouter()), neededUsdc);
        self.token0().approve(address(self.arrakisRouter()), neededToken0);
        _addLiquidityAndStakeWithSlippage(self, neededUsdc, neededToken0);
    }

    function _healthFactorBalanceIGt(StrategyArrakisWmatic self) internal {
        IPool aavePool = _aavePoolEm(self);
        (uint256 collateral, uint256 borrow,,,,) = aavePool.getUserAccountData(address(self));

        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances(self);

        AaveBorrowLibrary.GetLpTokensForBalanceParams memory params = AaveBorrowLibrary.GetLpTokensForBalanceParams(
            collateral,
            borrow,
            amount0Current,
            amount1Current,
            self.liquidationThreshold(),
            self.healthFactor(),
            self.usdcTokenDenominator(),
            self.token0Denominator(),
            uint256(self.oracleChainlinkUsdc().latestAnswer()),
            uint256(self.oracleChainlinkToken0().latestAnswer()),
            self.arrakisVault().totalSupply()
        );

        uint256 amountLp = AaveBorrowLibrary.getLpTokensForBalance(params);
        self.arrakisRewards().approve(address(self.arrakisRouter()), amountLp);

        (uint256 amount0, uint256 amount1) = _removeLiquidityAndUnstakeWithSlippage(self, amountLp);

        if (amount0 > 0) {
            self.usdcToken().approve(address(aavePool), amount0);
            aavePool.supply(address(self.usdcToken()), amount0, address(self), self.referralCode());
        }

        self.token0().approve(address(aavePool), amount1);
        aavePool.repay(address(self.token0()), amount1, self.interestRateMode(), address(self));
    }

    function _aavePoolEm(StrategyArrakisWmatic self) internal returns (IPool aavePool){
        aavePool = IPool(AaveBorrowLibrary.getAavePool(address(self.aavePoolAddressesProvider()), self.eModeCategoryId()));
    }
}
