// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library VestingTier {
    enum TierType { SEED, PRIVATE, PUBLIC }
    
    struct TierConfig {
        TierType tierType;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 tgePercent; // TGE = Token Generation Event (immediate unlock %)
        string name;
    }
    
    struct InvestorVesting {
        address investor;
        TierType tier;
        uint256 totalAmount;
        uint256 tgeAmount;
        uint256 vestedAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 cliffEnd;
        uint256 vestingEnd;
        bool revoked;
    }
    
    function getTierConfig(TierType tier) internal pure returns (TierConfig memory) {
        if (tier == TierType.SEED) {
            return TierConfig({
                tierType: TierType.SEED,
                cliffDuration: 180 days,      // 6 bulan cliff
                vestingDuration: 730 days,     // 2 tahun vesting
                tgePercent: 5,                 // 5% unlock di TGE
                name: "Seed"
            });
        } else if (tier == TierType.PRIVATE) {
            return TierConfig({
                tierType: TierType.PRIVATE,
                cliffDuration: 90 days,        // 3 bulan cliff
                vestingDuration: 547 days,     // 1.5 tahun vesting
                tgePercent: 10,                // 10% unlock di TGE
                name: "Private"
            });
        } else {
            return TierConfig({
                tierType: TierType.PUBLIC,
                cliffDuration: 30 days,        // 1 bulan cliff
                vestingDuration: 365 days,     // 1 tahun vesting
                tgePercent: 20,                // 20% unlock di TGE
                name: "Public"
            });
        }
    }
}
