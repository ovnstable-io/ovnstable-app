const {getContract, getPrice, changeWeightsAndBalance} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0xA2007Ae378d95C7c5Fe9f166DB17307d32cb8893",
            "name": "Venus Busd",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 5,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xb9D731080b9e862C3a6B7eaF0E5a086614d0a2d9",
            "name": "Synapse BUSD",
            "minWeight": 0,
            "targetWeight": 17.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xed197258b388AfaAD5f0D46B608B583E395ede92",
            "name": "Cone BUSD/USDC",
            "minWeight": 0,
            "targetWeight": 70,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xed197258b388AfaAD5f0D46B608B583E395ede92",
            "name": "Cone BUSD/TUSD",
            "minWeight": 0,
            "targetWeight": 10,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
    ]

    let totalWeight = 0;
    for (const weight of weights) {
        totalWeight += weight.targetWeight * 1000;
    }
    console.log(`totalWeight: ${totalWeight}`)

    if (totalWeight !== 100000) {
        console.log(`Total weight not 100000`)
        return
    }

    weights = weights.map(value => {
        delete value.name
        value.targetWeight = value.targetWeight * 1000;
        value.maxWeight = value.maxWeight * 1000;

        return value;
    })

    await balanceLpTokens();
    await changeWeightsAndBalance(weights);
    //await proposal(weights);
    //await setWeights(weights);
}

async function proposal(weights) {
    let pm = await getContract('PortfolioManager');
    let exchange = await getContract('Exchange');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('setStrategyWeights', [weights]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('balance', []));

    await createProposal(addresses, values, abis);
}

async function setWeights(weights) {
    let pm = await getContract('PortfolioManager', 'bsc');

    await (await pm.setStrategyWeights(weights)).wait();
    await (await pm.balance()).wait();
}

async function balanceLpTokens() {

    let timelock = await getContract('OvnTimelockController');
    let strategyConeBusdUsdc = await getContract('StrategyConeBusdUsdc');

    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock.address],
    });

    const timelockAccount = await hre.ethers.getSigner(timelock.address);

    await (await strategyConeBusdUsdc.connect(timelockAccount).balanceLpTokens()).wait();
    console.log('balanceLpTokens done()');

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [timelock.address],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

