const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("👥 Adding Investors to Vesting...\n");

  const deployment = JSON.parse(fs.readFileSync('deployment-info.json', 'utf8'));
  
  const token = await hre.ethers.getContractAt("ProjectToken", deployment.token);
  const vesting = await hre.ethers.getContractAt("InvestorVestingManager", deployment.vesting);

  // Sample investors - GANTI DENGAN ADDRESS REAL
  const investors = [
    // SEED Investors
    {
      address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      tier: 0, // SEED
      amount: hre.ethers.parseEther("5000000") // 5M tokens
    },
    {
      address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      tier: 0, // SEED
      amount: hre.ethers.parseEther("3000000") // 3M tokens
    },
    // PRIVATE Investors
    {
      address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      tier: 1, // PRIVATE
      amount: hre.ethers.parseEther("2000000") // 2M tokens
    },
    {
      address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      tier: 1, // PRIVATE
      amount: hre.ethers.parseEther("1500000") // 1.5M tokens
    },
    // PUBLIC Investors
    {
      address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      tier: 2, // PUBLIC
      amount: hre.ethers.parseEther("500000") // 500K tokens
    },
    {
      address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      tier: 2, // PUBLIC
      amount: hre.ethers.parseEther("300000") // 300K tokens
    }
  ];

  // Calculate total amount
  const totalAmount = investors.reduce(
    (sum, inv) => sum + inv.amount,
    BigInt(0)
  );

  console.log("📋 Investor Summary:");
  console.log("Total Investors:", investors.length);
  console.log("Total Allocation:", hre.ethers.formatEther(totalAmount), "VTK\n");

  // Approve total amount
  console.log("1️⃣ Approving tokens...");
  const approveTx = await token.approve(deployment.vesting, totalAmount);
  await approveTx.wait();
  console.log("✅ Approved\n");

  // Add investors
  console.log("2️⃣ Adding investors...");
  for (let i = 0; i < investors.length; i++) {
    const inv = investors[i];
    const tierName = ['SEED', 'PRIVATE', 'PUBLIC'][inv.tier];
    
    console.log(`Adding ${inv.address} (${tierName}) - ${hre.ethers.formatEther(inv.amount)} VTK`);
    
    const tx = await vesting.addInvestor(inv.address, inv.tier, inv.amount);
    await tx.wait();
    console.log(`✅ Added\n`);
  }

  // Get analytics
  const analytics = await vesting.getAnalytics();
  
  console.log("📊 Final Analytics:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Total Allocated:", hre.ethers.formatEther(analytics[0]), "VTK");
  console.log("Total Investors:", analytics[2].toString());
  console.log("\nBy Tier:");
  console.log("SEED:", hre.ethers.formatEther(analytics[3]), "VTK -", analytics[9].toString(), "investors");
  console.log("PRIVATE:", hre.ethers.formatEther(analytics[4]), "VTK -", analytics[10].toString(), "investors");
  console.log("PUBLIC:", hre.ethers.formatEther(analytics[5]), "VTK -", analytics[11].toString(), "investors");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n✅ All investors added successfully!");
  console.log("📝 Next: Execute TGE when ready");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
