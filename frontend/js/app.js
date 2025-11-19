let web3;
let account;
let vestingContract;
let tokenContract;

// GANTI DENGAN ADDRESS DEPLOYED CONTRACTS
const VESTING_ADDRESS = 'YOUR_VESTING_CONTRACT_ADDRESS';
const TOKEN_ADDRESS = 'YOUR_TOKEN_CONTRACT_ADDRESS';
const EXPECTED_CHAIN_ID = 97; // BSC Testnet

const VESTING_ABI = [
    {
        "inputs": [],
        "name": "claimTGE",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "release",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_investor", "type": "address"}],
        "name": "getInvestorInfo",
        "outputs": [
            {"internalType": "enum VestingTier.TierType", "name": "tier", "type": "uint8"},
            {"internalType": "uint256", "name": "totalAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "tgeAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "vestedAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "releasedAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "releasableAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "startTime", "type": "uint256"},
            {"internalType": "uint256", "name": "cliffEnd", "type": "uint256"},
            {"internalType": "uint256", "name": "vestingEnd", "type": "uint256"},
            {"internalType": "bool", "name": "revoked", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAnalytics",
        "outputs": [
            {"internalType": "uint256", "name": "_totalAllocated", "type": "uint256"},
            {"internalType": "uint256", "name": "_totalReleased", "type": "uint256"},
            {"internalType": "uint256", "name": "_totalInvestors", "type": "uint256"},
            {"internalType": "uint256", "name": "seedAllocated", "type": "uint256"},
            {"internalType": "uint256", "name": "privateAllocated", "type": "uint256"},
            {"internalType": "uint256", "name": "publicAllocated", "type": "uint256"},
            {"internalType": "uint256", "name": "seedReleased", "type": "uint256"},
            {"internalType": "uint256", "name": "privateReleased", "type": "uint256"},
            {"internalType": "uint256", "name": "publicReleased", "type": "uint256"},
            {"internalType": "uint256", "name": "seedInvestors", "type": "uint256"},
            {"internalType": "uint256", "name": "privateInvestors", "type": "uint256"},
            {"internalType": "uint256", "name": "publicInvestors", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "tgeExecuted",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
];

const TIER_NAMES = ['SEED', 'PRIVATE', 'PUBLIC'];
const TIER_COLORS = ['#8b5cf6', '#6366f1', '#10b981'];

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showNotification('Please install MetaMask!', 'error');
        return;
    }

    try {
        web3 = new Web3(window.ethereum);
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        account = accounts[0];

        // Check network
        const chainId = await web3.eth.getChainId();
        if (Number(chainId) !== EXPECTED_CHAIN_ID) {
            await switchNetwork();
            return;
        }

        document.getElementById('walletAddress').textContent = 
            `${account.substring(0, 6)}...${account.substring(38)}`;
        document.getElementById('connectBtn').textContent = 'Connected ✓';
        document.getElementById('connectBtn').disabled = true;

        vestingContract = new web3.eth.Contract(VESTING_ABI, VESTING_ADDRESS);

        await loadInvestorData();
        await loadAnalytics();
        
        showNotification('Wallet connected successfully!', 'success');
    } catch (error) {
        console.error('Connection error:', error);
        showNotification('Error connecting wallet: ' + error.message, 'error');
    }
}

async function switchNetwork() {
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x61' }], // BSC Testnet
        });
        await connectWallet();
    } catch (error) {
        if (error.code === 4902) {
            try {
                await ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x61',
                        chainName: 'BSC Testnet',
                        nativeCurrency: {
                            name: 'BNB',
                            symbol: 'BNB',
                            decimals: 18
                        },
                        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
                        blockExplorerUrls: ['https://testnet.bscscan.com']
                    }]
                });
                await connectWallet();
            } catch (addError) {
                showNotification('Failed to add BSC Testnet', 'error');
            }
        }
    }
}

async function loadInvestorData() {
    try {
        const info = await vestingContract.methods.getInvestorInfo(account).call();
        
        if (info.totalAmount == 0) {
            showNotification('No vesting allocation found for this address', 'info');
            document.getElementById('noVestingMessage').style.display = 'block';
            return;
        }

        const tierName = TIER_NAMES[info.tier];
        const totalAmount = web3.utils.fromWei(info.totalAmount, 'ether');
        const tgeAmount = web3.utils.fromWei(info.tgeAmount, 'ether');
        const vestedAmount = web3.utils.fromWei(info.vestedAmount, 'ether');
        const releasedAmount = web3.utils.fromWei(info.releasedAmount, 'ether');
        const claimableAmount = web3.utils.fromWei(info.releasableAmount, 'ether');

        // Update stats
        document.getElementById('tierName').textContent = tierName;
        document.getElementById('tierName').className = `tier-badge ${tierName.toLowerCase()}`;
        document.getElementById('totalAllocation').textContent = formatNumber(totalAmount) + ' VTK';
        document.getElementById('vestedAmount').textContent = formatNumber(vestedAmount) + ' VTK';
        document.getElementById('releasedAmount').textContent = formatNumber(releasedAmount) + ' VTK';
        document.getElementById('claimableAmount').textContent = formatNumber(claimableAmount) + ' VTK';

        // Update progress
        const progress = totalAmount > 0 ? (parseFloat(vestedAmount) / parseFloat(totalAmount)) * 100 : 0;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressFill').textContent = progress.toFixed(2) + '%';
        document.getElementById('progressPercent').textContent = progress.toFixed(2) + '%';

        // Generate schedule
        generateSchedule(info, tierName);

        // Update claim section
        document.getElementById('claimableDisplay').textContent = formatNumber(claimableAmount);
        
        const tgeExecuted = await vestingContract.methods.tgeExecuted().call();
        if (tgeExecuted && parseFloat(claimableAmount) > 0) {
            document.getElementById('claimBtn').disabled = false;
        }

        // Create vesting chart
        createVestingChart(info, totalAmount);

    } catch (error) {
        console.error('Error loading investor data:', error);
        showNotification('Error loading data: ' + error.message, 'error');
    }
}

function generateSchedule(info, tierName) {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';

    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(info.startTime);
    const cliffEnd = Number(info.cliffEnd);
    const vestingEnd = Number(info.vestingEnd);

    if (startTime === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">TGE not executed yet</td></tr>';
        return;
    }

    const milestones = [
        {
            name: 'TGE Unlock',
            date: startTime,
            percent: tierName === 'SEED' ? 5 : tierName === 'PRIVATE' ? 10 : 20,
            status: 'completed'
        },
        {
            name: 'Cliff End',
            date: cliffEnd,
            percent: 0,
            status: now >= cliffEnd ? 'completed' : 'locked'
        },
        {
            name: 'Vesting Complete',
            date: vestingEnd,
            percent: 100,
            status: now >= vestingEnd ? 'completed' : now >= cliffEnd ? 'vesting' : 'locked'
        }
    ];

    milestones.forEach(milestone => {
        const row = `
            <tr>
                <td><strong>${milestone.name}</strong></td>
                <td>${new Date(milestone.date * 1000).toLocaleString()}</td>
                <td>${milestone.percent}%</td>
                <td><span class="status-badge status-${milestone.status}">${milestone.status.toUpperCase()}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function createVestingChart(info, totalAmount) {
    const ctx = document.getElementById('vestingChart');
    if (!ctx) return;

    const startTime = Number(info.startTime);
    const vestingEnd = Number(info.vestingEnd);
    
    if (startTime === 0) return;

    const months = [];
    const values = [];
    const duration = vestingEnd - startTime;
    const monthCount = Math.ceil(duration / (30 * 24 * 60 * 60));

    for (let i = 0; i <= monthCount; i++) {
        const timestamp = startTime + (i * 30 * 24 * 60 * 60);
        months.push(`Month ${i}`);
        
        // Calculate vested amount at this time
        const tgePercent = Number(info.tier) === 0 ? 5 : Number(info.tier) === 1 ? 10 : 20;
        const tgeAmount = parseFloat(totalAmount) * tgePercent / 100;
        
        if (timestamp < Number(info.cliffEnd)) {
            values.push(tgeAmount);
        } else if (timestamp >= vestingEnd) {
            values.push(parseFloat(totalAmount));
        } else {
            const timeVested = timestamp - startTime;
            const vestableAmount = parseFloat(totalAmount) - tgeAmount;
            const vested = tgeAmount + (vestableAmount * timeVested / duration);
            values.push(vested);
        }
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Vested Tokens',
                data: values,
                borderColor: TIER_COLORS[Number(info.tier)],
                backgroundColor: TIER_COLORS[Number(info.tier)] + '20',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Vesting Schedule Timeline'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value) + ' VTK';
                        }
                    }
                }
            }
        }
    });
}

async function loadAnalytics() {
    try {
        const analytics = await vestingContract.methods.getAnalytics().call();
        
        document.getElementById('totalInvestors').textContent = analytics[2].toString();
        
        const totalAllocated = web3.utils.fromWei(analytics[0], 'ether');
        const totalReleased = web3.utils.fromWei(analytics[1], 'ether');
        
        document.getElementById('globalProgress').textContent = 
            totalAllocated > 0 ? ((parseFloat(totalReleased) / parseFloat(totalAllocated)) * 100).toFixed(2) + '%' : '0%';
            
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

async function claimTokens() {
    try {
        document.getElementById('claimBtn').innerHTML = '<span class="loading-spinner"></span> Claiming...';
        document.getElementById('claimBtn').disabled = true;

        const tx = await vestingContract.methods.release().send({ from: account });
        
        showNotification('Tokens claimed successfully! TX: ' + tx.transactionHash, 'success');
        
        await loadInvestorData();
        await loadAnalytics();
        
        document.getElementById('claimBtn').textContent = 'Claim Tokens';
    } catch (error) {
        console.error('Claim error:', error);
        showNotification('Error claiming tokens: ' + error.message, 'error');
        document.getElementById('claimBtn').textContent = 'Claim Tokens';
        document.getElementById('claimBtn').disabled = false;
    }
}

async function claimTGE() {
    try {
        document.getElementById('tgeBtn').innerHTML = '<span class="loading-spinner"></span> Claiming TGE...';
        document.getElementById('tgeBtn').disabled = true;

        const tx = await vestingContract.methods.claimTGE().send({ from: account });
        
        showNotification('TGE tokens claimed successfully!', 'success');
        
        await loadInvestorData();
        await loadAnalytics();
        
        document.getElementById('tgeBtn').style.display = 'none';
    } catch (error) {
        console.error('TGE claim error:', error);
        showNotification('Error claiming TGE: ' + error.message, 'error');
        document.getElementById('tgeBtn').textContent = 'Claim TGE Tokens';
        document.getElementById('tgeBtn').disabled = false;
    }
}

function formatNumber(num) {
    return parseFloat(num).toLocaleString('en-US', { 
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    });
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification ' + type;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Auto refresh every 30 seconds
setInterval(() => {
    if (account && vestingContract) {
        loadInvestorData();
        loadAnalytics();
    }
}, 30000);
