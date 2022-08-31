// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "@overnight-contracts/connectors/contracts/stuff/Cone.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Venus.sol";
import "@overnight-contracts/connectors/contracts/stuff/Dodo.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";

import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";

import "./libraries/UsdPlusWbnbLibrary.sol";
import "./core/HedgeStrategy.sol";
import "./control/ControlUsdPlusWbnb.sol";

import "hardhat/console.sol";

contract StrategyUsdPlusWbnb is HedgeStrategy, IERC721Receiver {
    using WadRayMath for uint256;
    using UsdPlusWbnbLibrary for StrategyUsdPlusWbnb;

    uint256 public constant MAX_UINT_VALUE = type(uint256).max;
    uint256 public constant MAX_TIME_LOCK = 126268429; // value in seconds = 4 years

    IERC20 public usdPlus;
    IERC20 public busd;
    IERC20 public wbnb;
    VenusInterface public vBusdToken;
    VenusInterface public vBnbToken;
    uint256 public busdDm;
    uint256 public wbnbDm;
    uint256 public bnbDm;
    IPriceFeed public oracleBusd;
    IPriceFeed public oracleWbnb;

    IConeRouter01 public coneRouter;
    IConePair public conePair;
    IConeVoter public coneVoter;
    IGauge public coneGauge;
    IERC20 public coneToken;
    VeCone public veCone;
    uint public veConeId;

    IExchange public exchange;

    IDODOProxy public dodoProxy;
    address public dodoBusdWbnb;

    uint256 public tokenAssetSlippagePercent;

    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public realHealthFactor;

    Maximillion public maximillion;

    ControlUsdPlusWbnb public control;

    struct SetupParams {
        address usdPlus;
        address busd;
        address wbnb;
        address vBusdToken;
        address vBnbToken;
        address unitroller;
        address maximillion;
        address oracleBusd;
        address oracleWbnb;
        address coneRouter;
        address conePair;
        address coneVoter;
        address coneGauge;
        address coneToken;
        address veCone;
        uint veConeId;
        address exchange;
        address dodoProxy;
        address dodoBusdWbnb;
        address dodoApprove;
        uint256 tokenAssetSlippagePercent;
        uint256 liquidationThreshold;
        uint256 healthFactor;
        address control;
    }



    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- setters

    function setParams(SetupParams calldata params) external onlyAdmin {
        usdPlus = IERC20(params.usdPlus);
        busd = IERC20(params.busd);
        wbnb = IERC20(params.wbnb);
        vBusdToken = VenusInterface(params.vBusdToken);
        vBnbToken = VenusInterface(params.vBnbToken);
        busdDm = 10 ** IERC20Metadata(params.busd).decimals();
        wbnbDm = 10 ** IERC20Metadata(params.wbnb).decimals();
        bnbDm = 10 ** 18;
        oracleBusd = IPriceFeed(params.oracleBusd);
        oracleWbnb = IPriceFeed(params.oracleWbnb);

        setAsset(params.usdPlus);

        coneRouter = IConeRouter01(params.coneRouter);
        conePair = IConePair(params.conePair);
        coneVoter = IConeVoter(params.coneVoter);
        coneGauge = IGauge(params.coneGauge);
        coneToken = IERC20(params.coneToken);
        veCone = VeCone(params.veCone);
        veConeId = params.veConeId;

        exchange = IExchange(params.exchange);

        dodoProxy = IDODOProxy(params.dodoProxy);
        dodoBusdWbnb = params.dodoBusdWbnb;

        tokenAssetSlippagePercent = params.tokenAssetSlippagePercent;

        busd.approve(address(params.dodoApprove), type(uint256).max);
        wbnb.approve(address(params.dodoApprove), type(uint256).max);

        usdPlus.approve(address(coneRouter), type(uint256).max);
        wbnb.approve(address(coneRouter), type(uint256).max);
        conePair.approve(address(coneRouter), type(uint256).max);
        conePair.approve(address(coneGauge), type(uint256).max);

        usdPlus.approve(address(exchange), type(uint256).max);
        busd.approve(address(exchange), type(uint256).max);

        Unitroller troll = Unitroller(params.unitroller);
        address[] memory vTokens = new address[](2);
        vTokens[0] = address(vBusdToken);
        vTokens[1] = address(vBnbToken);
        uint[] memory errors = troll.enterMarkets(vTokens);

        maximillion = Maximillion(params.maximillion);

        liquidationThreshold = params.liquidationThreshold * 10 ** 15;
        healthFactor = params.healthFactor * 10 ** 15;
        realHealthFactor = 0;

        control = ControlUsdPlusWbnb(params.control);
        control.setStrategy(payable(this));
    }

    // --- logic

    function _stake(uint256 _amount) internal override {
        control.calcDeltas(Method.STAKE, _amount);
    }

    function _unstake(
        uint256 _amount
    ) internal override returns (uint256) {
        control.calcDeltas(Method.UNSTAKE, _amount);
        return _amount;
    }


    function netAssetValue() external view override returns (uint256){
        return control.netAssetValue();
    }

    function balances() external view override returns(BalanceItem[] memory ){
        return control.balances();
    }


    function _balance() internal override returns (uint256) {
        control.calcDeltas(Method.NOTHING, 0);
        return realHealthFactor;
    }

    function setRealHealthFactor(uint256 _realHealthFactor) external onlyControl {
        realHealthFactor = _realHealthFactor;
    }

    function currentHealthFactor() external view override returns (uint256){
        return realHealthFactor;
    }

    function executeAction(Action memory action) external {
        if (action.actionType == ActionType.ADD_LIQUIDITY) {
            console.log("execute action ADD_LIQUIDITY");
            UsdPlusWbnbLibrary._addLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.REMOVE_LIQUIDITY) {
            console.log("execute action REMOVE_LIQUIDITY");
            UsdPlusWbnbLibrary._removeLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_USDPLUS_TO_ASSET) {
            console.log("execute action SWAP_USDPLUS_TO_ASSET");
            UsdPlusWbnbLibrary._swapUspPlusToBusd(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_USDPLUS) {
            console.log("execute action SWAP_ASSET_TO_USDPLUS");
            UsdPlusWbnbLibrary._swapBusdToUsdPlus(this, action.amount);
        } else if (action.actionType == ActionType.SUPPLY_ASSET_TO_AAVE) {
            console.log("execute action SUPPLY_ASSET_TO_AAVE");
            UsdPlusWbnbLibrary._supplyBusdToVenus(this, action.amount);
        } else if (action.actionType == ActionType.WITHDRAW_ASSET_FROM_AAVE) {
            console.log("execute action WITHDRAW_ASSET_FROM_AAVE");
            UsdPlusWbnbLibrary._withdrawBusdFromVenus(this, action.amount);
        } else if (action.actionType == ActionType.BORROW_TOKEN_FROM_AAVE) {
            console.log("execute action BORROW_TOKEN_FROM_AAVE");
            UsdPlusWbnbLibrary._borrowWbnbFromVenus(this, action.amount);
        } else if (action.actionType == ActionType.REPAY_TOKEN_TO_AAVE) {
            console.log("execute action REPAY_TOKEN_TO_AAVE");
            UsdPlusWbnbLibrary._repayWbnbToVenus(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_TOKEN_TO_ASSET) {
            console.log("execute action SWAP_TOKEN_TO_ASSET");
            UsdPlusWbnbLibrary._swapTokenToAsset(this, action.amount, action.slippagePercent);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_TOKEN) {
            console.log("execute action SWAP_ASSET_TO_TOKEN");
            UsdPlusWbnbLibrary._swapAssetToToken(this, action.amount, action.slippagePercent);
        }
    }



    function _claimFeesBribes() internal {

        coneGauge.claimFees();
        IBribe bribe = IBribe(coneGauge.bribe());

        address[] memory tokens = new address[](1);
        tokens[0] = address(coneToken);
        tokens[1] = address(wbnb);
        tokens[2] = address(usdPlus);
        bribe.getRewardForOwner(veConeId, tokens);

        uint256 wbnbAmount = wbnb.balanceOf(address(this));
        uint256 usdPlusAmount = usdPlus.balanceOf(address(this));
        uint256 coneAmount = coneToken.balanceOf(address(this));

        if (wbnbAmount > 0) {
            coneGauge.notifyRewardAmount(address(wbnb), wbnbAmount);
        }

        if (usdPlusAmount > 0) {
            coneGauge.notifyRewardAmount(address(usdPlus), usdPlusAmount);
        }

        if (coneAmount > 0) {
            coneGauge.notifyRewardAmount(address(coneToken), coneAmount);
        }

    }


    function _claimRewards(address _to) internal override returns (uint256){

        _claimFeesBribes();
        _increaseVeConeUnlockTime();

        // claim rewards
        address[] memory tokens = new address[](1);
        tokens[0] = address(coneToken);
        coneGauge.getReward(address(this), tokens);

        // sell rewards
        uint256 totalUsdPlus;

        uint256 coneBalance = coneToken.balanceOf(address(this));

        if (coneBalance > 0) {
            uint256 amountOutMin = ConeLibrary.getAmountsOut(
                coneRouter,
                address(coneToken),
                address(wbnb),
                address(usdPlus),
                false,
                false,
                coneBalance
            );

            if (amountOutMin > 0) {
                uint256 coneBusd = ConeLibrary.swap(
                    coneRouter,
                    address(coneToken),
                    address(wbnb),
                    address(usdPlus),
                    false,
                    false,
                    coneBalance,
                    amountOutMin * 99 / 100,
                    address(this)
                );

                totalUsdPlus += coneBusd;
            }
        }


        return totalUsdPlus;
    }


    function lockAvailableCone() external onlyPortfolioAgent {

        if (veConeId > 0) {
            veCone.increaseAmount(veConeId, coneToken.balanceOf(address(this)));
        }
    }

    function _increaseVeConeUnlockTime() internal {

        if (veConeId > 0) {
            veCone.increaseUnlockTime(veConeId, MAX_TIME_LOCK);
        }
    }

    function vote(address[] calldata _poolVote, int256[] calldata _weights) external onlyAdmin {
        coneVoter.vote(veConeId, _poolVote, _weights);
    }

    /// @notice Used for ERC721 safeTransferFrom
    function onERC721Received(address, address, uint256, bytes memory)
    public
    virtual
    override
    returns (bytes4)
    {
        return this.onERC721Received.selector;
    }

    receive() external payable {
    }
}
