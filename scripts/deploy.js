const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log(" Deploying Investor Vesting Dashboard to BSC Testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  // Deploy ProjectToken
  console.log(" Deploying ProjectToken...");
  const ProjectToken = await hre.ethers.getContractFactory("ProjectToken");
  const token = await ProjectToken.deploy(
    "Venture Token",
    "VTK",
    100000000 // 100 million tokens
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(" ProjectToken deployed to:", tokenAddress);

  // Deploy InvestorVestingManager
  console.log("\n2️ Deploying InvestorVestingManager...");
  const InvestorVestingManager = await hre.ethers.getContractFactory("InvestorVestingManager");
  const vesting = await InvestorVestingManager.deploy(tokenAddress);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log(" InvestorVestingManager deployed to:", vestingAddress);

  // Get token info
  const tokenBalance = await token.balanceOf(deployer.address);
  
  console.log("\n Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network:", hre.network.name);
  console.log("Token Address:", tokenAddress);
  console.log("Vesting Address:", vestingAddress);
  console.log("Deployer:", deployer.address);
  console.log("Token Balance:", hre.ethers.formatEther(tokenBalance), "VTK");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n Next Steps:");
  console.log("1. Copy addresses ke frontend files");
  console.log("2. Approve token untuk vesting contract");
  console.log("3. Add investors dengan addInvestors.js");
  console.log("4. Execute TGE saat ready");
  
  // Save addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    token: tokenAddress,
    vesting: vestingAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };
  
  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n Deployment info saved to deployment-info.json");

  // Verify instructions
  console.log("\n Verify contracts dengan:");
  console.log(`npx hardhat verify --network bscTestnet ${tokenAddress} "Venture Token" "VTK" "100000000000000000000000000"`);
  console.log(`npx hardhat verify --network bscTestnet ${vestingAddress} ${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
