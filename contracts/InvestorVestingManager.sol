// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VestingTier.sol";

contract InvestorVestingManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using VestingTier for VestingTier.TierType;

    IERC20 public immutable token;
    
    mapping(address => VestingTier.InvestorVesting) public vestingSchedules;
    address[] public investors;
    
    // Analytics data
    mapping(VestingTier.TierType => uint256) public totalAllocatedByTier;
    mapping(VestingTier.TierType => uint256) public totalReleasedByTier;
    mapping(VestingTier.TierType => uint256) public investorCountByTier;
    
    uint256 public totalAllocated;
    uint256 public totalReleased;
    uint256 public tgeTimestamp;
    bool public tgeExecuted;

    event InvestorAdded(
        address indexed investor,
        VestingTier.TierType tier,
        uint256 amount,
        uint256 startTime
    );
    event TokensReleased(
        address indexed investor,
        uint256 amount,
        VestingTier.TierType tier
    );
    event TGEExecuted(uint256 timestamp);
    event VestingRevoked(address indexed investor, uint256 refundAmount);

    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    function addInvestor(
        address _investor,
        VestingTier.TierType _tier,
        uint256 _amount
    ) external onlyOwner {
        require(_investor != address(0), "Invalid investor");
        require(_amount > 0, "Amount must be > 0");
        require(vestingSchedules[_investor].totalAmount == 0, "Investor exists");
        require(!tgeExecuted, "TGE already executed");

        token.safeTransferFrom(msg.sender, address(this), _amount);

        VestingTier.TierConfig memory config = VestingTier.getTierConfig(_tier);
        uint256 tgeAmount = (_amount * config.tgePercent) / 100;

        vestingSchedules[_investor] = VestingTier.InvestorVesting({
            investor: _investor,
            tier: _tier,
            totalAmount: _amount,
            tgeAmount: tgeAmount,
            vestedAmount: 0,
            releasedAmount: 0,
            startTime: 0, // Set saat TGE
            cliffEnd: 0,
            vestingEnd: 0,
            revoked: false
        });

        investors.push(_investor);
        
        // Update analytics
        totalAllocated += _amount;
        totalAllocatedByTier[_tier] += _amount;
        investorCountByTier[_tier]++;

        emit InvestorAdded(_investor, _tier, _amount, block.timestamp);
    }

    function executeTGE() external onlyOwner {
        require(!tgeExecuted, "TGE already executed");
        
        tgeTimestamp = block.timestamp;
        tgeExecuted = true;

        // Set start time untuk semua investor
        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            VestingTier.InvestorVesting storage vesting = vestingSchedules[investor];
            
            if (vesting.totalAmount > 0 && !vesting.revoked) {
                VestingTier.TierConfig memory config = VestingTier.getTierConfig(vesting.tier);
                
                vesting.startTime = tgeTimestamp;
                vesting.cliffEnd = tgeTimestamp + config.cliffDuration;
                vesting.vestingEnd = tgeTimestamp + config.vestingDuration;
            }
        }

        emit TGEExecuted(tgeTimestamp);
    }

    function claimTGE() external nonReentrant {
        require(tgeExecuted, "TGE not executed");
        
        VestingTier.InvestorVesting storage vesting = vestingSchedules[msg.sender];
        require(vesting.totalAmount > 0, "No vesting found");
        require(!vesting.revoked, "Vesting revoked");
        require(vesting.releasedAmount == 0, "TGE already claimed");

        uint256 tgeAmount = vesting.tgeAmount;
        require(tgeAmount > 0, "No TGE allocation");

        vesting.releasedAmount = tgeAmount;
        vesting.vestedAmount = tgeAmount;
        
        totalReleased += tgeAmount;
        totalReleasedByTier[vesting.tier] += tgeAmount;

        token.safeTransfer(msg.sender, tgeAmount);

        emit TokensReleased(msg.sender, tgeAmount, vesting.tier);
    }

    function release() external nonReentrant {
        require(tgeExecuted, "TGE not executed");
        
        VestingTier.InvestorVesting storage vesting = vestingSchedules[msg.sender];
        require(vesting.totalAmount > 0, "No vesting found");
        require(!vesting.revoked, "Vesting revoked");

        uint256 releasable = _releasableAmount(vesting);
        require(releasable > 0, "No tokens to release");

        vesting.releasedAmount += releasable;
        
        totalReleased += releasable;
        totalReleasedByTier[vesting.tier] += releasable;

        token.safeTransfer(msg.sender, releasable);

        emit TokensReleased(msg.sender, releasable, vesting.tier);
    }

    function _releasableAmount(VestingTier.InvestorVesting memory vesting) 
        private 
        view 
        returns (uint256) 
    {
        uint256 vested = _vestedAmount(vesting);
        vesting.vestedAmount = vested;
        return vested - vesting.releasedAmount;
    }

    function _vestedAmount(VestingTier.InvestorVesting memory vesting) 
        private 
        view 
        returns (uint256) 
    {
        if (!tgeExecuted || vesting.startTime == 0) {
            return 0;
        }

        uint256 vestableAmount = vesting.totalAmount - vesting.tgeAmount;

        if (block.timestamp < vesting.cliffEnd) {
            return vesting.tgeAmount; // Hanya TGE yang available
        } else if (block.timestamp >= vesting.vestingEnd) {
            return vesting.totalAmount; // Semua vested
        } else {
            // Linear vesting setelah cliff
            uint256 timeVested = block.timestamp - vesting.startTime;
            VestingTier.TierConfig memory config = VestingTier.getTierConfig(vesting.tier);
            uint256 vestedFromLinear = (vestableAmount * timeVested) / config.vestingDuration;
            return vesting.tgeAmount + vestedFromLinear;
        }
    }

    function revokeVesting(address _investor) external onlyOwner {
        VestingTier.InvestorVesting storage vesting = vestingSchedules[_investor];
        require(vesting.totalAmount > 0, "No vesting found");
        require(!vesting.revoked, "Already revoked");

        uint256 vested = _vestedAmount(vesting);
        uint256 refund = vesting.totalAmount - vested;

        vesting.revoked = true;

        if (refund > 0) {
            token.safeTransfer(owner(), refund);
        }

        emit VestingRevoked(_investor, refund);
    }

    function getInvestorInfo(address _investor) 
        external 
        view 
        returns (
            VestingTier.TierType tier,
            uint256 totalAmount,
            uint256 tgeAmount,
            uint256 vestedAmount,
            uint256 releasedAmount,
            uint256 releasableAmount,
            uint256 startTime,
            uint256 cliffEnd,
            uint256 vestingEnd,
            bool revoked
        ) 
    {
        VestingTier.InvestorVesting memory vesting = vestingSchedules[_investor];
        return (
            vesting.tier,
            vesting.totalAmount,
            vesting.tgeAmount,
            _vestedAmount(vesting),
            vesting.releasedAmount,
            _releasableAmount(vesting),
            vesting.startTime,
            vesting.cliffEnd,
            vesting.vestingEnd,
            vesting.revoked
        );
    }

    function getAnalytics() 
        external 
        view 
        returns (
            uint256 _totalAllocated,
            uint256 _totalReleased,
            uint256 _totalInvestors,
            uint256 seedAllocated,
            uint256 privateAllocated,
            uint256 publicAllocated,
            uint256 seedReleased,
            uint256 privateReleased,
            uint256 publicReleased,
            uint256 seedInvestors,
            uint256 privateInvestors,
            uint256 publicInvestors
        )
    {
        return (
            totalAllocated,
            totalReleased,
            investors.length,
            totalAllocatedByTier[VestingTier.TierType.SEED],
            totalAllocatedByTier[VestingTier.TierType.PRIVATE],
            totalAllocatedByTier[VestingTier.TierType.PUBLIC],
            totalReleasedByTier[VestingTier.TierType.SEED],
            totalReleasedByTier[VestingTier.TierType.PRIVATE],
            totalReleasedByTier[VestingTier.TierType.PUBLIC],
            investorCountByTier[VestingTier.TierType.SEED],
            investorCountByTier[VestingTier.TierType.PRIVATE],
            investorCountByTier[VestingTier.TierType.PUBLIC]
        );
    }

    function getAllInvestors() external view returns (address[] memory) {
        return investors;
    }

    function getInvestorCount() external view returns (uint256) {
        return investors.length;
    }
}
