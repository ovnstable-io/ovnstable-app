// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IERC20MintableBurnable.sol";
import "./interfaces/IConnector.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IPortfolioManager.sol";
import "./libraries/math/WadRayMath.sol";
import "./UsdPlusToken.sol";
import "./PortfolioManager.sol";
import "hardhat/console.sol";

contract Exchange is AccessControl {
    using WadRayMath for uint256;

    // ---  fields

    UsdPlusToken public usdPlus;
    IERC20 public usdc;

    PortfolioManager public portfolioManager; //portfolio manager contract
    IMark2Market public mark2market;

    uint256 public buyFee = 40;
    uint256 public buyFeeDenominator = 100000; // ~ 100 %

    uint256 public redeemFee = 40;
    uint256 public redeemFeeDenominator = 100000; // ~ 100 %

    // percent limit to start sending proportionally tokens from vault
    uint256 public notEnoughLimit = 98000;
    uint256 public notEnoughLimitDenominator = 100000; // ~ 100 %

    // next payout time in epoch seconds
    uint256 public nextPayoutTime = 1637193600; // 1637193600 = 2021-11-18T00:00:00Z

    // period between payouts in seconds, need to calc nextPayoutTime
    uint256 public payoutPeriod = 24 * 60 * 60;

    // range of time for starting near next payout time at seconds
    // if time in [nextPayoutTime-payoutTimeRange;nextPayoutTime+payoutTimeRange]
    //    then payouts can be started by payout() method anyone
    // else if time more than nextPayoutTime+payoutTimeRange
    //    then payouts started by any next buy/redeem
    uint256 public payoutTimeRange = 15 * 60;

    // ---  events

    event TokensUpdated(address usdPlus, address usdc);
    event Mark2MarketUpdated(address mark2market);
    event PortfolioManagerUpdated(address portfolioManager);
    event BuyFeeUpdated(uint256 fee, uint256 feeDenominator);
    event RedeemFeeUpdated(uint256 fee, uint256 feeDenominator);
    event NotEnoughLimitUpdated(uint256 limit, uint256 denominator);
    event PayoutTimesUpdated(uint256 nextPayoutTime, uint256 payoutPeriod, uint256 payoutTimeRange);

    event EventExchange(string label, uint256 amount, uint256 fee, address sender);
    event PayoutEvent(
        uint256 totalUsdPlus,
        uint256 totalUsdc,
        uint256 totallyAmountPaid
    );
    event NoEnoughForPayoutEvent(uint256 totalUsdPlus, uint256 totalUsdc);
    event PaidBuyFee(uint256 amount, uint256 feeAmount);
    event PaidRedeemFee(uint256 amount, uint256 feeAmount);
    event NextPayoutTime(uint256 nextPayoutTime);
    event OnNotEnoughLimitRedeemed(address token, uint256 amount);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    // ---  constructor

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---  setters

    function setTokens(address _usdPlus, address _usdc) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        usdPlus = UsdPlusToken(_usdPlus);
        usdc = IERC20(_usdc);
        emit TokensUpdated(_usdPlus, _usdc);
    }

    function setPortfolioManager(address _portfolioManager) external onlyAdmin {
        require(_portfolioManager != address(0), "Zero address not allowed");
        portfolioManager = PortfolioManager(_portfolioManager);
        emit PortfolioManagerUpdated(_portfolioManager);
    }

    function setMark2Market(address _mark2market) external onlyAdmin {
        require(_mark2market != address(0), "Zero address not allowed");
        mark2market = IMark2Market(_mark2market);
        emit Mark2MarketUpdated(_mark2market);
    }

    function setBuyFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        buyFee = _fee;
        buyFeeDenominator = _feeDenominator;
        emit BuyFeeUpdated(buyFee, buyFeeDenominator);
    }

    function setRedeemFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        redeemFee = _fee;
        redeemFeeDenominator = _feeDenominator;
        emit RedeemFeeUpdated(redeemFee, redeemFeeDenominator);
    }

    function setNotEnoughLimit(uint256 _limit, uint256 _limitDenominator) external onlyAdmin {
        require(_limitDenominator != 0, "Zero denominator not allowed");
        notEnoughLimit = _limit;
        notEnoughLimitDenominator = _limitDenominator;
        emit NotEnoughLimitUpdated(notEnoughLimit, notEnoughLimitDenominator);
    }

    function setPayoutTimes(
        uint256 _nextPayoutTime,
        uint256 _payoutPeriod,
        uint256 _payoutTimeRange
    ) external onlyAdmin {
        require(_nextPayoutTime != 0, "Zero _nextPayoutTime not allowed");
        require(_payoutPeriod != 0, "Zero _payoutPeriod not allowed");
        require(_nextPayoutTime > _payoutTimeRange, "_nextPayoutTime shoud be more than _payoutTimeRange");
        nextPayoutTime = _nextPayoutTime;
        payoutPeriod = _payoutPeriod;
        payoutTimeRange = _payoutTimeRange;
        emit PayoutTimesUpdated(nextPayoutTime, payoutPeriod, payoutTimeRange);
    }

    // ---  logic

    function balance() public view returns (uint256) {
        return usdPlus.balanceOf(msg.sender);
    }

    function buy(address _addrTok, uint256 _amount) external {
        require(_addrTok == address(usdc), "Only USDC tokens currently available for buy");

        uint256 balance = IERC20(_addrTok).balanceOf(msg.sender);
        require(balance >= _amount, "Not enough tokens to buy");

        IERC20(_addrTok).transferFrom(msg.sender, address(this), _amount);

        uint256 buyFeeAmount = (_amount * buyFee) / buyFeeDenominator;
        uint256 buyAmount = _amount - buyFeeAmount;
        emit PaidBuyFee(buyAmount, buyFeeAmount);

        emit EventExchange("buy", buyAmount, buyFeeAmount, msg.sender);

        usdPlus.mint(msg.sender, buyAmount);

        IERC20(_addrTok).transfer(address(portfolioManager), _amount);
        portfolioManager.deposit(IERC20(_addrTok), _amount);

        // prevent stucked payout caller
        if (block.timestamp > nextPayoutTime + payoutTimeRange) {
            _payout();
        }
    }

    /**
     * @param _addrTok Token to withdraw
     * @param _amount Amount of OVN tokens to burn
     */
    function redeem(address _addrTok, uint256 _amount) external {
        require(_addrTok == address(usdc), "Only USDC tokens currently available for redeem");

        uint256 redeemFeeAmount = (_amount * redeemFee) / redeemFeeDenominator;
        uint256 redeemAmount = _amount - redeemFeeAmount;
        emit PaidRedeemFee(redeemAmount, redeemFeeAmount);

        emit EventExchange("redeem", redeemAmount, redeemFeeAmount, msg.sender);

        uint256 totalUsdPlusSupply = usdPlus.totalSupply();
        uint256 totalUsdc = mark2market.totalUsdcPrice();
        // denormalize from 10**18 to 10**6 as OVN decimals
        totalUsdc = totalUsdc / 10 ** 12;

        uint256 totalOvnSupplyNotEnoughLimit = totalUsdPlusSupply * notEnoughLimit / notEnoughLimitDenominator;
        // check if we should return back to user proportionally tokens from Vault
        if (totalUsdc < totalOvnSupplyNotEnoughLimit) {
            // redeemAmount should be in OVN and or equivalent to USDC

            // Calc user redeem shares
            uint256 redeemProportionDenominator = 10 ** 18;
            uint256 redeemProportion = redeemProportionDenominator * redeemAmount / totalUsdPlusSupply;

            // Burn OVN from sender
            usdPlus.burn(msg.sender, _amount);

            address[] memory withdrewTokens = portfolioManager.withdrawProportional(
                redeemProportion,
                redeemProportionDenominator
            );
            for (uint8 i; i < withdrewTokens.length; i++) {
                address withdrewToken = withdrewTokens[i];
                uint256 withdrewBalance = IERC20(withdrewToken).balanceOf(address(this));
                if (withdrewBalance > 0) {
                    IERC20(withdrewToken).transfer(msg.sender, withdrewBalance);
                    emit OnNotEnoughLimitRedeemed(withdrewToken, withdrewBalance);
                }
            }
            return;
        }


        //TODO: Real unstacked amount may be different to _amount
        uint256 unstakedAmount = portfolioManager.withdraw(IERC20(_addrTok), redeemAmount);

        // Or just burn from sender
        usdPlus.burn(msg.sender, _amount);

        // TODO: correct amount by rates or oracles
        // TODO: check threshhold limits to withdraw deposite
        require(
            IERC20(_addrTok).balanceOf(address(this)) >= unstakedAmount,
            "Not enough for transfer unstakedAmount"
        );
        IERC20(_addrTok).transfer(msg.sender, unstakedAmount);

        // prevent stucked payout caller
        if (block.timestamp > nextPayoutTime + payoutTimeRange) {
            _payout();
        }
    }

    //TODO: remove after moving to payout() usage
    function reward() external onlyAdmin {
        _payout();
    }

    function payout() public onlyAdmin {
        _payout();
    }

    function _payout() internal {
        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return;
        }

        // 0. call claiming reward and balancing on PM
        // 1. get current amount of USD+
        // 2. get total sum of USDC we can get from any source
        // 3. calc difference between total count of USD+ and USDC
        // 4. update USD+ liquidity index

        portfolioManager.claimRewards();
        portfolioManager.balanceOnReward();

        uint256 totalUsdPlusSupply = usdPlus.totalBalance();
        uint256 totalUsdc = mark2market.totalUsdcPrice();
        // denormilize from 10**18 to 10**6 as USD+ decimals
        totalUsdc = totalUsdc / 10**12;
        if (totalUsdc <= totalUsdPlusSupply) {
            emit NoEnoughForPayoutEvent(totalUsdPlusSupply, totalUsdc);
            return;
        }
        uint difference = totalUsdc - totalUsdPlusSupply;

        uint256 totalUsdPlusSupplyRay = totalUsdPlusSupply.wadToRay();
        uint256 totalUsdcSupplyRay = totalUsdc.wadToRay();
        // in ray
        uint256 newLiquidityIndex = totalUsdcSupplyRay.rayDiv(totalUsdPlusSupplyRay);
        usdPlus.setLiquidityIndex(newLiquidityIndex);

        emit PayoutEvent(
            totalUsdPlusSupply,
            totalUsdc,
            difference
        );

        // update next payout time. Cycle for preventing gaps
        for (; block.timestamp >= nextPayoutTime - payoutTimeRange; ) {
            nextPayoutTime = nextPayoutTime + payoutPeriod;
        }
        emit NextPayoutTime(nextPayoutTime);
    }
}
