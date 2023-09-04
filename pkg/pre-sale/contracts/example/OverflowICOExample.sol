// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./LinearVestingExample.sol";

contract OverflowICOExample is Ownable, LinearVestingExample {
    using SafeERC20 for IERC20;

    IERC20 public immutable salesToken;
    IERC20 public immutable emissionToken;
    uint256 public immutable tokensToSell;
    uint256 public immutable ethersToRaise;
    uint256 public immutable refundThreshold;
    uint256 public immutable totalEmission;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable receiveTime;
    address public immutable burnAddress;
    uint256 public immutable vestingProportion;

    uint256 public immutable minCommit;
    uint256 public immutable maxCommit;

    bool public started;
    bool public finished;

    uint256 emissionPerEther;
    uint256 lastUpdate;
    uint256 public totalCommitments;
    mapping(address => uint256) public commitments;
    mapping(address => uint256) public missedEmissions;
    mapping(address => uint256) public finalEmissions;
    mapping(address => uint256) public finalTokens;

    mapping(address => bool) public whitelist;

    event Commit(address indexed buyer, uint256 amount);
    event Claim(address indexed buyer, uint256 eth, uint256 token, uint256 emission);
    event Claim2(address indexed buyer, uint256 token, uint256 emission);


    modifier onlyWhitelist() {
        require(whitelist[msg.sender], "!whitelist");
        _;
    }

    function calculateEmission(uint256 value) internal view returns (uint256) {
        return (value * emissionPerEther) / 10 ** 18;
    }

    function _updateEmission() internal {
        require(block.timestamp >= startTime, "not started");
        if (totalCommitments > 0) {
            uint256 elapsed = Math.min(block.timestamp, endTime) - Math.max(Math.min(lastUpdate, endTime), startTime);
            uint256 emission = (totalEmission * elapsed) / (endTime - startTime);
            emissionPerEther += (emission * 10 ** 18) / totalCommitments;
        }
        lastUpdate = block.timestamp;
    }

    struct SetUpParams {
        IERC20 salesToken;
        uint256 tokensToSell;
        uint256 ethersToRaise;
        uint256 refundThreshold;
        uint256 startTime;
        uint256 endTime;
        uint256 receiveTime;
        uint256 vestingBegin;
        uint256 vestingDuration;
        uint256 vestingProportion;
        uint256 minCommit;
        uint256 maxCommit;
        IERC20 emissionToken;
        uint256 totalEmission;
        address burnAddress;
    }

    constructor(
        SetUpParams memory params
    ) LinearVestingExample(params.salesToken, params.vestingBegin, params.vestingDuration) {
        require(params.startTime >= block.timestamp, "Start time must be in the future.");
        require(params.endTime > params.startTime, "End time must be greater than start time.");
        require(params.ethersToRaise > 0, "Ethers to raise should be greater than 0");
        require(params.ethersToRaise > params.refundThreshold, "Ethers to raise should be greater than refund threshold");
        require(params.minCommit > 0, "Minimum commitment should be greater than 0");
        require(params.maxCommit >= params.minCommit, "Maximum commitment should be greater or equal to minimum commitment");

        salesToken = params.salesToken;
        tokensToSell = params.tokensToSell;
        ethersToRaise = params.ethersToRaise;
        refundThreshold = params.refundThreshold;
        startTime = params.startTime;
        endTime = params.endTime;
        receiveTime = params.receiveTime;
        minCommit = params.minCommit;
        maxCommit = params.maxCommit;
        emissionToken = params.emissionToken;
        totalEmission = params.totalEmission;
        burnAddress = params.burnAddress;
        vestingProportion = params.vestingProportion;
    }



    function start() external onlyOwner {
        require(!started, "Already started.");
        started = true;
        salesToken.safeTransferFrom(msg.sender, address(this), tokensToSell);
        emissionToken.safeTransferFrom(msg.sender, address(this), totalEmission);
    }


    function commit() external payable nonReentrant onlyWhitelist {
        _updateEmission();
        require(
            started && block.timestamp >= startTime && block.timestamp < endTime,
            "Can only deposit Ether during the sale period."
        );
        require(
            minCommit <= commitments[msg.sender] + msg.value && commitments[msg.sender] + msg.value <= maxCommit,
            "Commitment amount is outside the allowed range."
        );
        commitments[msg.sender] += msg.value;
        totalCommitments += msg.value;
        missedEmissions[msg.sender] += calculateEmission(msg.value);
        emit Commit(msg.sender, msg.value);
    }

    function simulateClaim(address user) external returns (uint256, uint256, uint256) {
        _updateEmission();
        if (finalTokens[user] > 0) {
            return (0, finalTokens[user], finalEmissions[user]);
        }

        if (commitments[user] == 0) return (0, 0, 0);

        if (totalCommitments >= refundThreshold) {
            uint256 ethersToSpend = Math.min(commitments[user], (commitments[user] * ethersToRaise) / totalCommitments);
            uint256 ethersToRefund = commitments[user] - ethersToSpend;
            uint256 tokensToReceive = (tokensToSell * ethersToSpend) / ethersToRaise;
            uint256 emission = calculateEmission(commitments[user]) - missedEmissions[user];

            return (ethersToRefund, tokensToReceive, emission);
        } else {
            uint256 amt = commitments[user];
            return (amt, 0, 0);
        }
    }

    function claim() external nonReentrant returns (uint256, uint256, uint256) {
        _updateEmission();
        require(block.timestamp > endTime, "Can only claim tokens after the sale has ended.");
        require(commitments[msg.sender] > 0, "You have not deposited any Ether.");

        if (totalCommitments >= refundThreshold) {
            uint256 ethersToSpend =
            Math.min(commitments[msg.sender], (commitments[msg.sender] * ethersToRaise) / totalCommitments);
            uint256 ethersToRefund = commitments[msg.sender] - ethersToSpend;
            uint256 tokensToReceive = (tokensToSell * ethersToSpend) / ethersToRaise;
            uint256 emission = calculateEmission(commitments[msg.sender]) - missedEmissions[msg.sender];
            missedEmissions[msg.sender] += emission;

            commitments[msg.sender] = 0;

            finalEmissions[msg.sender] = emission;
            finalTokens[msg.sender] = tokensToReceive;

            (bool success,) = msg.sender.call{value: ethersToRefund}("");
            require(success, "Failed to transfer ether");
            emit Claim(msg.sender, ethersToRefund, tokensToReceive, emission);
            return (ethersToRefund, tokensToReceive, emission);
        } else {
            uint256 amt = commitments[msg.sender];
            commitments[msg.sender] = 0;
            (bool success,) = msg.sender.call{value: amt}("");
            require(success, "Failed to transfer ether");
            emit Claim(msg.sender, amt, 0, 0);
            return (amt, 0, 0);
        }
    }

    function claim2() external nonReentrant {
        require(block.timestamp >= receiveTime, "not claimable yet");
        uint256 a1 = finalTokens[msg.sender];
        uint256 a2 = finalEmissions[msg.sender];
        require(a1 != 0 || a2 != 0);
        finalTokens[msg.sender] = 0;
        finalEmissions[msg.sender] = 0;

        uint256 vesting = a1 * vestingProportion / 1e18;
        _grantVestedReward(msg.sender, vesting);

        salesToken.safeTransfer(msg.sender, a1 - vesting);
        emissionToken.safeTransfer(msg.sender, a2);
        emit Claim2(msg.sender, a1, a2);
    }

    function finish() external onlyOwner {
        require(block.timestamp > endTime, "Can only finish after the sale has ended.");
        require(!finished, "Already finished.");
        finished = true;

        if (totalCommitments >= refundThreshold) {
            (bool success,) = owner().call{value: Math.min(ethersToRaise, totalCommitments)}("");
            require(success, "Failed to transfer ether");
            if (ethersToRaise > totalCommitments) {
                uint256 tokensToBurn = (tokensToSell * (ethersToRaise - totalCommitments)) / ethersToRaise;
                salesToken.safeTransfer(burnAddress, tokensToBurn);
            }
        } else {
            salesToken.safeTransfer(owner(), tokensToSell);
            emissionToken.safeTransfer(owner(), totalEmission);
        }
    }

    function donate() external payable {
        // Anyone can donate a few gwei to fix integer division accuracy issues.
        // Typically, the deployer will call this.
    }

    function addToWhitelist(address[] calldata toAddAddresses)
    external onlyOwner
    {
        for (uint i = 0; i < toAddAddresses.length; i++) {
            whitelist[toAddAddresses[i]] = true;
        }
    }

    /**
     * @notice Remove from whitelist
     */
    function removeFromWhitelist(address[] calldata toRemoveAddresses)
    external onlyOwner
    {
        for (uint i = 0; i < toRemoveAddresses.length; i++) {
            delete whitelist[toRemoveAddresses[i]];
        }
    }

}
