// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IStrategy.sol";


contract PortfolioManager is IPortfolioManager, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    uint256 public constant TOTAL_WEIGHT = 100000; // 100000 ~ 100%

    // ---  fields

    address public exchanger;
    IERC20 asset;
    mapping(address => uint256) public strategyWeightPositions;
    StrategyWeight[] public strategyWeights;
    IStrategy public cashStrategy;
    IMark2Market public m2m;


    // ---  events

    event ExchangerUpdated(address value);
    event Mark2MarketUpdated(address value);
    event AssetUpdated(address value);
    event CashStrategyAlreadySet(address value);
    event CashStrategyUpdated(address value);
    event CashStrategyRestaked(uint256 value);
    event Balance();
    event Exchanged(uint256 amount, address from, address to);

    event StrategyWeightUpdated(
        uint256 index,
        address strategy,
        uint256 minWeight,
        uint256 targetWeight,
        uint256 maxWeight,
        bool enabled,
        bool enabledReward
    );


    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyExchanger() {
        require(hasRole(EXCHANGER, msg.sender), "Caller is not the EXCHANGER");
        _;
    }

    modifier cashStrategySet() {
        require(address(cashStrategy) != address(0), "Cash strategy not set yet");
        _;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}

    // ---  setters

    function setExchanger(address _exchanger) public onlyAdmin {
        require(_exchanger != address(0), "Zero address not allowed");

        revokeRole(EXCHANGER, exchanger);
        grantRole(EXCHANGER, _exchanger);

        exchanger = _exchanger;
        emit ExchangerUpdated(_exchanger);
    }

    function setMark2Market(address _m2m) public onlyAdmin {
        require(_m2m != address(0), "Zero address not allowed");

        m2m = IMark2Market(_m2m);
        emit Mark2MarketUpdated(_m2m);
    }


    function setAsset(address _asset) public onlyAdmin {
        require(_asset != address(0), "Zero address not allowed");

        asset = IERC20(_asset);
        emit AssetUpdated(_asset);
    }

    function setCashStrategy(address _cashStrategy) public onlyAdmin {
        require(_cashStrategy != address(0), "Zero address not allowed");

        if (_cashStrategy == address(cashStrategy)) {
            emit CashStrategyAlreadySet(_cashStrategy);
            return;
        }
        bool needMoveCash = address(cashStrategy) != address(0);
        if (needMoveCash) {
            // unstake everything
            cashStrategy.unstake(
                address(asset),
                0,
                address(this),
                true
            );
        }

        cashStrategy = IStrategy(_cashStrategy);

        if (needMoveCash) {
            uint256 amount = asset.balanceOf(address(this));
            if (amount > 0) {
                asset.transfer(address(cashStrategy), amount);
                cashStrategy.stake(
                    address(asset),
                    amount
                );
                emit CashStrategyRestaked(amount);
            }
        }

        emit CashStrategyUpdated(_cashStrategy);
    }



    // ---  logic

    function deposit(IERC20 _token, uint256 _amount) external override onlyExchanger cashStrategySet {
        require(address(_token) == address(asset), "PM: Only asset available to deposit");

        // 1. get cashStrategy current asset amount
        // 2. get cashStrategy upper limit
        // 3. if _amount + current < limit then just stake to cash strategy
        // 4. else call _balance

        uint256 pmAssetBalance = asset.balanceOf(address(this));
        if (pmAssetBalance == 0) {
            // zero asset amount always fit in cash strategy but also zero stake result
            // so we can return now
            return;
        }

        uint256 totalAsset = pmAssetBalance;
        uint256 totalWeight = 0;
        for (uint8 i; i < strategyWeights.length; i++) {
            if (!strategyWeights[i].enabled) {// Skip if strategy is not enabled
                continue;
            }
            totalAsset += IStrategy(strategyWeights[i].strategy).netAssetValue();
            totalWeight += strategyWeights[i].targetWeight;
        }

        uint256 currentCashLiquidity = cashStrategy.netAssetValue();
        StrategyWeight memory cashStrategyWeight = getStrategyWeight(address(cashStrategy));
        //TODO: can be optimized by saving previous totalAsset gere and in balance
        uint256 maxCashLiquidity = (totalAsset * cashStrategyWeight.maxWeight) / totalWeight;

        if (currentCashLiquidity + pmAssetBalance < maxCashLiquidity) {
            // we may add _amount to cash strategy without balancing
            asset.transfer(address(cashStrategy), pmAssetBalance);
            cashStrategy.stake(
                address(asset),
                pmAssetBalance
            );
            return;
        }

        _balance();
    }


    function withdraw(IERC20 _token, uint256 _amount)
    external
    override
    onlyExchanger
    cashStrategySet
    returns (uint256) {

        require(address(_token) == address(asset), "PM: Only asset available to withdraw");

        // if cash strategy has enough liquidity then prevent balancing
        uint256 liquidationValue = cashStrategy.liquidationValue();
        if (liquidationValue > _amount) {
            cashStrategy.unstake(
                address(asset),
                _amount,
                address(this),
                false
            );
        } else {
            // balance to needed amount
            _balance(_token, _amount);
        }

        uint256 currentBalance = _token.balanceOf(address(this));

        // `if` is cheaper then `require` when need build complex message
        if (currentBalance < _amount) {
            revert(string(
                abi.encodePacked(
                    "In portfolioManager not enough for transfer _amount: ",
                    Strings.toString(currentBalance),
                    " < ",
                    Strings.toString(_amount)
                )
            ));
        }

        // transfer back tokens
        _token.transfer(exchanger, _amount);

        return _amount;
    }

    function claimAndBalance() external override onlyExchanger {
        _claimRewards();
        _healthFactorBalance();
        _balance();
    }

    function _claimRewards() internal {
        StrategyWeight[] memory strategies = getAllStrategyWeights();

        for (uint8 i; i < strategies.length; i++) {
            StrategyWeight memory item = strategies[i];

            if (item.enabledReward) {
                IStrategy(item.strategy).claimRewards(address(this));
            }
        }
    }

    function balance() public override onlyAdmin {
        _balance();
        emit Balance();
    }

    function _balance() internal {
        // Same to zero withdrawal balance
        _balance(IERC20(address(0)), 0);
    }

    function _balance(IERC20 withdrawToken, uint256 withdrawAmount) internal {

        // after balancing, we need to make sure that we did not lose money when:
        // 1) transferring from one strategy to another
        // 2) when execute stake/unstake

        // allowable losses 0.04% = USD+ mint/redeem fee
        uint256 minNavExpected = OvnMath.subBasisPoints(m2m.totalNetAssets(), 4); //0.04%
        minNavExpected = minNavExpected - withdrawAmount; // subscribe withdraw amount

        StrategyWeight[] memory strategies = getAllStrategyWeights();

        // 1. calc total asset equivalent
        uint256 totalAsset = asset.balanceOf(address(this));
        uint256 totalWeight = 0;
        for (uint8 i; i < strategies.length; i++) {
            if (!strategies[i].enabled) {// Skip if strategy is not enabled
                continue;
            }

            // UnstakeFull from Strategies with targetWeight == 0
            if(strategies[i].targetWeight == 0){
                totalAsset += IStrategy(strategies[i].strategy).unstake(
                    address(asset),
                    0,
                    address(this),
                    true
                );
            }else {
                totalAsset += IStrategy(strategies[i].strategy).netAssetValue();
                totalWeight += strategies[i].targetWeight;
            }

        }

        if (address(withdrawToken) == address(asset)) {
            require(totalAsset >= withdrawAmount, "Trying withdraw more than liquidity available");
            // it make to move to PortfolioManager extra asset to withdraw
            totalAsset = totalAsset - withdrawAmount;
        }

        // 3. calc diffs for strategies liquidity
        Order[] memory stakeOrders = new Order[](strategies.length);
        uint8 stakeOrdersCount = 0;
        for (uint8 i; i < strategies.length; i++) {

            if (!strategies[i].enabled) {// Skip if strategy is not enabled
                continue;
            }

            uint256 targetLiquidity;
            if (strategies[i].targetWeight == 0) {
                targetLiquidity = 0;
            } else {
                targetLiquidity = (totalAsset * strategies[i].targetWeight) / totalWeight;
            }

            uint256 currentLiquidity = IStrategy(strategies[i].strategy).netAssetValue();
            if (targetLiquidity == currentLiquidity) {
                // skip already at target strategies
                continue;
            }

            if (targetLiquidity < currentLiquidity) {
                // unstake now
                IStrategy(strategies[i].strategy).unstake(
                    address(asset),
                    currentLiquidity - targetLiquidity,
                    address(this),
                    false
                );
            } else {
                // save to stake later
                stakeOrders[stakeOrdersCount] = Order(
                    true,
                    strategies[i].strategy,
                    targetLiquidity - currentLiquidity
                );
                stakeOrdersCount++;
            }
        }

        // 4.  make staking
        for (uint8 i; i < stakeOrdersCount; i++) {

            address strategy = stakeOrders[i].strategy;
            uint256 amount = stakeOrders[i].amount;

            uint256 currentBalance = asset.balanceOf(address(this));
            if (currentBalance < amount) {
                amount = currentBalance;
            }
            asset.transfer(strategy, amount);

            IStrategy(strategy).stake(
                address(asset),
                amount
            );
        }

        require(m2m.totalNetAssets() >= minNavExpected, "PM: NAV less than expected");

    }

    function setStrategyWeights(StrategyWeight[] calldata _strategyWeights) external onlyAdmin {
        uint256 totalTarget = 0;
        for (uint8 i = 0; i < _strategyWeights.length; i++) {
            StrategyWeight memory strategyWeight = _strategyWeights[i];
            require(strategyWeight.strategy != address(0), "weight without strategy");
            require(
                strategyWeight.minWeight <= strategyWeight.targetWeight,
                "minWeight shouldn't higher than targetWeight"
            );
            require(
                strategyWeight.targetWeight <= strategyWeight.maxWeight,
                "targetWeight shouldn't higher than maxWeight"
            );
            totalTarget += strategyWeight.targetWeight;
        }
        require(totalTarget == TOTAL_WEIGHT, "Total target should equal to TOTAL_WEIGHT");

        for (uint8 i = 0; i < _strategyWeights.length; i++) {
            _addStrategyWeightAt(_strategyWeights[i], i);
            strategyWeightPositions[strategyWeights[i].strategy] = i;
        }

        // truncate if need
        if (strategyWeights.length > _strategyWeights.length) {
            uint256 removeCount = strategyWeights.length - _strategyWeights.length;
            for (uint8 i = 0; i < removeCount; i++) {
                strategyWeights.pop();
            }
        }
    }

    function _addStrategyWeightAt(StrategyWeight memory strategyWeight, uint256 index) internal {
        uint256 currentLength = strategyWeights.length;
        // expand if need
        if (currentLength == 0 || currentLength - 1 < index) {
            uint256 additionalCount = index - currentLength + 1;
            for (uint8 i = 0; i < additionalCount; i++) {
                strategyWeights.push();
            }
        }
        strategyWeights[index] = strategyWeight;
        emit StrategyWeightUpdated(
            index,
            strategyWeight.strategy,
            strategyWeight.minWeight,
            strategyWeight.targetWeight,
            strategyWeight.maxWeight,
            strategyWeight.enabled,
            strategyWeight.enabledReward
        );
    }


    function getStrategyWeight(address strategy) public override view returns (StrategyWeight memory) {
        return strategyWeights[strategyWeightPositions[strategy]];
    }

    function getAllStrategyWeights() public override view returns (StrategyWeight[] memory) {
        return strategyWeights;
    }

    function healthFactorBalance() external override onlyExchanger {
        _healthFactorBalance();
    }

    function _healthFactorBalance() internal {
        StrategyWeight[] memory strategies = getAllStrategyWeights();

        for (uint8 i; i < strategies.length; i++) {

            if (!strategyWeights[i].enabled) {
                continue;
            }

            address strategyAddress = strategies[i].strategy;
            IStrategy(strategyAddress).healthFactorBalance();
        }
    }

}
