1. Install Dependencies

mkdir investor-vesting-dashboard
cd investor-vesting-dashboard
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-verify
npm install @openzeppelin/contracts dotenv chart.js

2. Initialize Hardhat
npx hardhat init
# choose: Create a JavaScript project

3. Setup Environment
Get testnet BNB from: https://testnet.bnbchain.org/faucet-smart
Export your private key from MetaMask (WITHOUT the 0x prefix)
Create a .env file with the configuration above.

4. Run tests
npx hardhat test

5. Compile Contracts
npx hardhat compile

6. Deploy to BSC Testnet
npx hardhat run scripts/deploy.js --network bscTestnet

7. Update Front end
const VESTING_ADDRESS = '0x5678...';
const TOKEN_ADDRESS = '0x1234...';

8. Add investor
# Edit addresses scripts/addInvestors.js
npx hardhat run scripts/addInvestors.js --network bscTestnet

9. Execute TGE (Token Generation Event)
npx hardhat console --network bscTestnet

on console

const vesting = await ethers.getContractAt("InvestorVestingManager", "VESTING_ADDRESS");
await vesting.executeTGE();


10. Run Front end

python -m http.server 8000

11. Test Flow:

Open http://localhost:8000
Connect MetaMask (switch to the BSC Testnet)
View your vesting schedule
Claim TGE tokens (if the TGE has been executed)
Monitor vesting progress
Claim vested tokens after the cliff period

12. Verify BSC Scan
npx hardhat verify --network bscTestnet TOKEN_ADDRESS "Venture Token" "VTK" "100000000000000000000000000"
npx hardhat verify --network bscTestnet VESTING_ADDRESS TOKEN_ADDRESS

13. Monitor Analytics
npx hardhat run scripts/checkAnalytics.js --network bscTestnet
