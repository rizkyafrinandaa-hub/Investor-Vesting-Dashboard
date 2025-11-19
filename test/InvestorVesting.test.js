const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("InvestorVestingManager", function () {
  let token, vesting, owner, seed1, private1, public1;
  const SEED_AMOUNT = ethers.parseEther("5000000");
  const PRIVATE_AMOUNT = ethers.parseEther("2000000");
  const PUBLIC_AMOUNT = ethers.parseEther("500000");

  beforeEach(async function () {
    [owner, seed1, private1, public1] = await ethers.getSigners();

    // Deploy token
    const ProjectToken = await ethers.getContractFactory("ProjectToken");
    token = await ProjectToken.deploy("Venture Token", "VTK", 100000000);

    // Deploy vesting
    const InvestorVestingManager = await ethers.getContractFactory("InvestorVestingManager");
    vesting = await InvestorVestingManager.deploy(await token.getAddress());

    // Approve and add investors
    const totalAmount = SEED_AMOUNT + PRIVATE_AMOUNT + PUBLIC_AMOUNT;
    await token.approve(await vesting.getAddress(), totalAmount);
    
    await vesting.addInvestor(seed1.address, 0, SEED_AMOUNT); // SEED
    await vesting.addInvestor(private1.address, 1, PRIVATE_AMOUNT); // PRIVATE
    await vesting.addInvestor(public1.address, 2, PUBLIC_AMOUNT); // PUBLIC
  });

  describe("Adding Investors", function () {
    it("Should add investors correctly", async function () {
      const analytics = await vesting.getAnalytics();
      expect(analytics[2]).to.equal(3); // 3 investors
    });

    it("Should track tier allocations", async function () {
      const analytics = await vesting.getAnalytics();
      expect(analytics[3]).to.equal(SEED_AMOUNT); // SEED allocation
      expect(analytics[4]).to.equal(PRIVATE_AMOUNT); // PRIVATE allocation
      expect(analytics[5]).to.equal(PUBLIC_AMOUNT); // PUBLIC allocation
    });
  });

  describe("TGE", function () {
    it("Should execute TGE", async function () {
      await vesting.executeTGE();
      expect(await vesting.tgeExecuted()).to.be.true;
    });

    it("Should allow TGE claim", async function () {
      await vesting.executeTGE();
      
      // Seed: 5% TGE
      const balanceBefore = await token.balanceOf(seed1.address);
      await vesting.connect(seed1).claimTGE();
      const balanceAfter = await token.balanceOf(seed1.address);
      
      const expectedTGE = SEED_AMOUNT * BigInt(5) / BigInt(100);
      expect(balanceAfter - balanceBefore).to.equal(expectedTGE);
    });
  });

  describe("Vesting Release", function () {
    it("Should not release before cliff", async function () {
      await vesting.executeTGE();
      await vesting.connect(seed1).claimTGE();
      
      // Try claim before cliff (180 days for seed)
      await time.increase(60 * 24 * 60 * 60); // 60 days
      
      await expect(
        vesting.connect(seed1).release()
      ).to.be.revertedWith("No tokens to release");
    });

    it("Should release after cliff", async function () {
      await vesting.executeTGE();
      await vesting.connect(seed1).claimTGE();
      
      // After cliff + some vesting
      await time.increase(365 * 24 * 60 * 60); // 1 year
      
      const balanceBefore = await token.balanceOf(seed1.address);
      await vesting.connect(seed1).release();
      const balanceAfter = await token.balanceOf(seed1.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should track analytics correctly", async function () {
      await vesting.executeTGE();
      await vesting.connect(seed1).claimTGE();
      await vesting.connect(private1).claimTGE();
      
      const analytics = await vesting.getAnalytics();
      expect(analytics[1]).to.be.gt(0); // Total released > 0
    });
  });
});
