const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const deployment = JSON.parse(fs.readFileSync('deployment-info.json', 'utf8'));
  const vesting = await hre.ethers.getContractAt("InvestorVestingManager", deployment.vesting);

  console.log("📊 Vesting Analytics Dashboard\n");

  const analytics = await vesting.getAnalytics();
  const tgeExecuted = await vesting.tgeExecuted();
  
  console.log("🎯 Overall Metrics:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Total Allocated:", hre.ethers.formatEther(analytics[0]), "VTK");
  console.log("Total Released:", hre.ethers.formatEther(analytics[1]), "VTK");
  console.log("Total Investors:", analytics[2].toString());
  console.log("TGE Status:", tgeExecuted ? "✅ Executed" : "⏳ Pending");
  
  const releasePercent = analytics[0] > 0 
    ? (Number(analytics[1]) / Number(analytics[0]) * 100).toFixed(2)
    : 0;
  console.log("Release Progress:", releasePercent + "%");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📈 Tier Breakdown:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const tiers = [
    { name: "SEED", allocated: analytics[3], released: analytics[6], investors: analytics[9] },
    { name: "PRIVATE", allocated: analytics[4], released: analytics[7], investors: analytics[10] },
    { name: "PUBLIC", allocated: analytics[5], released: analytics[8], investors: analytics[11] }
  ];

  tiers.forEach(tier => {
    console.log(`\n${tier.name}:`);
    console.log("  Allocated:", hre.ethers.formatEther(tier.allocated), "VTK");
    console.log("  Released:", hre.ethers.formatEther(tier.released), "VTK");
    console.log("  Investors:", tier.investors.toString());
    
    const tierPercent = tier.allocated > 0
      ? (Number(tier.released) / Number(tier.allocated) * 100).toFixed(2)
      : 0;
    console.log("  Progress:", tierPercent + "%");
  });
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
