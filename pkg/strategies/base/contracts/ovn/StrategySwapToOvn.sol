// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@overnight-contracts/core/contracts/Strategy.sol';
import '@overnight-contracts/connectors/contracts/stuff/Silo.sol';
import '@overnight-contracts/connectors/contracts/stuff/Chainlink.sol';
import '@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol';
import '@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol';
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

import "hardhat/console.sol";

/**
 * This strategy holds OVN and on ClaimRewards swaps USD+ to OVN
 */
contract StrategySwapToOvn is Strategy {
   
    IERC20 public usdPlus;
    IERC20 public ovn;
    IInchSwapper public inchSwapper;
    IRouter public aerodromeRouter;
    address public ovnUsdPlusPoolAddress;
    uint256 slippageBp;

    event StrategyUpdatedParams();

    struct StrategyParams {
        address usdPlus;
        address ovn;
        address inchSwapper;
        address aerodromeRouter;
        address ovnUsdPlusPool;
        uint256 slippageBp;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdPlus = IERC20(params.usdPlus);
        ovn = IERC20(params.ovn);
        inchSwapper = IInchSwapper(params.inchSwapper);
        aerodromeRouter = IRouter(params.aerodromeRouter);
        ovnUsdPlusPoolAddress = params.ovnUsdPlusPool;
        slippageBp = params.slippageBp;
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        return ovn.balanceOf(address(this));
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        return ovn.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return ovn.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return this.netAssetValue();
    }

    // here we swap USDPlus token to OVN
    function _claimRewards(address _to) internal override returns (uint256) {
        uint256 ovnBalanceBefore = ovn.balanceOf(address(this));
        uint256 underlyingUsdPlusBalance = usdPlus.balanceOf(address(this));

        uint256 outOvnBalanceEstimated = AerodromeLibrary.getAmountsOut(
            address(aerodromeRouter),
            address(usdPlus),
            address(ovn),
            ovnUsdPlusPoolAddress,
            underlyingUsdPlusBalance
        );

        uint256 amountOutMin = outOvnBalanceEstimated * (10_000 - slippageBp) / 10_000;
        usdPlus.approve(address(inchSwapper), underlyingUsdPlusBalance);
        inchSwapper.swap(address(this), address(usdPlus), address(ovn), underlyingUsdPlusBalance, amountOutMin);

        uint256 ovnBalanceAfter = ovn.balanceOf(address(this));
        uint256 totalRewardsClaimedOvn = ovnBalanceBefore - ovnBalanceAfter;
        if (totalRewardsClaimedOvn > 0) {
            ovn.transfer(_to, totalRewardsClaimedOvn);
        }

        return totalRewardsClaimedOvn;
    }
}
