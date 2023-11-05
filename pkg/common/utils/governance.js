const {fromE18, toE18, fromAsset, fromE6, toAsset} = require("./decimals");
const {expect} = require("chai");
const {getContract, initWallet, getPrice, impersonateAccount, getWalletAddress, getCoreAsset, convertWeights, getChainId} = require("./script-utils");
const hre = require('hardhat');
const {execTimelock, showM2M, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {createRandomWallet, getTestAssets, prepareEnvironment} = require("./tests");
const {Roles} = require("./roles");
const fs = require("fs");
const ethers= hre.ethers;
const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
const { platform } = process;

const appRoot = require('app-root-path').path;

async function createProposal(name, addresses, values, abis){

    let timelock = await getContract('AgentTimelock');

    let ovnAgent = await timelock.ovnAgent();
    let minDelay = await timelock.getMinDelay();


    let batch = {
        version: "1.0",
        chainId: await getChainId(),
        createdAt: new Date().getTime(),
        meta: {
            name: "Transactions Batch",
            description: "",
            txBuilderVersion: "1.16.2",
            createdFromSafeAddress: ovnAgent,
            createdFromOwnerAddress: "",
            checksum: ""
        },
        transactions: [

        ]
    }

    for (let i = 0; i < addresses.length; i++) {
        batch.transactions.push(createTransaction(timelock, minDelay, addresses[i], values[i], abis[i]))
    }

    let batchName;
    if (platform === 'win32'){
        batchName = `${appRoot}\\pkg\\proposals\\batches\\${process.env.STAND}\\${name}.json`;
    }else {
        batchName = `${appRoot}/pkg/proposals/batches/${process.env.STAND}/${name}.json`;
    }

    let data = JSON.stringify(batch);
    console.log(data)
    await fs.writeFileSync(batchName, data);
}

function createTransaction(timelock, delay, address, value, data){

    return {
        "to": timelock.address,
        "value": "0",
        "data": null,
        "contractMethod": {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "target",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "internalType": "bytes32",
                    "name": "predecessor",
                    "type": "bytes32"
                },
                {
                    "internalType": "bytes32",
                    "name": "salt",
                    "type": "bytes32"
                },
                {
                    "internalType": "uint256",
                    "name": "delay",
                    "type": "uint256"
                }
            ],
            "name": "schedule",
            "payable": false
        },
        "contractInputsValues": {
            "target": address,
            "value": `${value}`,
            "data": `${data}`,
            "predecessor": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "salt": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "delay": `${delay}`
        }
    }

}

async function testUsdPlus(id, stand = process.env.STAND){
    console.log(`Run tests USD+`);

    await prepareEnvironment();

    let exchange = await getContract('Exchange', stand);
    let pm = await getContract('PortfolioManager', stand);
    let m2m = await getContract('Mark2Market', stand);
    let usdPlusToken = await getContract('UsdPlusToken', stand);
    let asset = await getCoreAsset(stand);

    let params = await getPrice();

    let walletAddress = await getWalletAddress();
    await transferETH(10, walletAddress);

    let tables = [];

    tables.push({
        name: 'ID',
        result: id
    });

    tables.push({
        name: 'BlockNumber',
        result: await ethers.provider.getBlockNumber()
    });

    tables.push({
        name: 'Date/Time',
        result: new Date()
    });

    tables.push({
        name: 'Tests',
        result: '------'
    });

    tables.push(await testCase(async ()=>{

        let amountAsset = await asset.balanceOf(walletAddress);
        await (await asset.approve(exchange.address, amountAsset, params)).wait();
        await (await exchange.buy(asset.address, amountAsset, params)).wait();

    }, 'exchange.mint'));

    tables.push(await testCase(async ()=>{

        let amountUsdPlus = await usdPlusToken.balanceOf(walletAddress);
        await (await usdPlusToken.approve(exchange.address, amountUsdPlus, params)).wait();
        await (await exchange.redeem(asset.address, amountUsdPlus, params)).wait();

    }, 'exchange.redeem'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=>{
            await (await pm.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address, params)).wait();
            await (await pm.connect(timelock).balance(params)).wait();
        });

    }, 'pm.balance'));

    tables.push(await testCase(async ()=>{
        await m2m.strategyAssets();
    }, 'm2m.strategyAssets'));

    tables.push(await testCase(async ()=>{
        await m2m.totalNetAssets();
    }, 'm2m.totalNetAssets'));

    tables.push(await testCase(async ()=>{
        await m2m.totalLiquidationAssets();
    }, 'm2m.totalLiquidationAssets'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=>{
            await (await exchange.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address, params)).wait();
            await (await exchange.connect(timelock).grantRole(Roles.UNIT_ROLE, timelock.address, params)).wait();
            await (await exchange.connect(timelock).setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60, params)).wait();
            await (await exchange.connect(timelock).payout(params)).wait();
        });

    }, 'exchange.payout'));

    console.table(tables);
}

async function testCase(test, id) {

    try {
        await test();
        return{
            name: id,
            result: 'SUCCESS'
        }
    } catch (e) {
        console.error(`[Test] Fail test case: ${id}: ${e}`);
        return{
            name: id,
            result: 'FAIL'
        }
    }
}

async function testStrategy(id, strategy, stand = process.env.STAND) {

    let asset = await getCoreAsset();

    let walletAddress = await getWalletAddress();
    await transferETH(10, walletAddress);

    let params = await getPrice();

    let tables = [];

    tables.push({
        name: 'ID',
        result: id
    });

    tables.push({
        name: 'BlockNumber',
        result: await ethers.provider.getBlockNumber()
    });

    tables.push({
        name: 'Date/Time',
        result: new Date()
    });

    tables.push({
        name: 'Tests',
        result: '------'
    });

    tables.push(await testCase(async ()=>{
        await strategy.netAssetValue();
    }, 'strategy.netAssetValue'));

    tables.push(await testCase(async ()=>{
        await strategy.netAssetValue();
    }, 'strategy.liquidationValue'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=> {
            await strategy.connect(timelock).setPortfolioManager(timelock.address, params);

            await getTestAssets(walletAddress);
            let amount = toAsset(10_000);
            await asset.transfer(strategy.address, amount, params);
            await strategy.connect(timelock).stake(asset.address, amount, params);
        });
    }, 'strategy.stake'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=> {
            await strategy.connect(timelock).setPortfolioManager(timelock.address, params);
            let amount = toAsset(10_000);
            await strategy.connect(timelock).unstake(asset.address, amount, walletAddress, false, params);
        });
    }, 'strategy.unstake'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=> {
            await strategy.connect(timelock).setPortfolioManager(timelock.address, params);
            let amount = toAsset(10_000);
            await strategy.connect(timelock).claimRewards(timelock.address, params);
        });
    }, 'strategy.claimRewards'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=> {
            await strategy.connect(timelock).setPortfolioManager(timelock.address, params);
            await strategy.connect(timelock).unstake(asset.address, 0, walletAddress, true, params);
        });
    }, 'strategy.unstakeFull'));

    console.table(tables);
}

async function testProposal(addresses, values, abis){

    console.log('Count transactions: ' + addresses.length);

    await execTimelock(async (timelock)=>{

        for (let i = 0; i < addresses.length; i++) {

            let address = addresses[i];
            let abi = abis[i];

            let tx = {
                from: timelock.address,
                to: address,
                value: 0,
                data: abi,
                gasLimit: 15000000
            }

            console.log(`Transaction: index: [${i}] address: [${address}]`)
            await (await timelock.sendTransaction(tx)).wait();

        }
    })
}

async function getProposalState(proposalId){
    let governor = await getContract('OvnGovernor');
    let state = proposalStates[await governor.state(proposalId)];
    console.log('Proposal state: ' + state);

    let data = await governor.proposals(proposalId);

    console.log('StartBlock:     ' + data.startBlock);
    console.log('EndBlock:       ' + data.endBlock);
    console.log('CurrentBlock:   ' + await ethers.provider.getBlockNumber());
    console.log('ForVotes:       ' + fromE18(data.forVotes));

    return state;
}

module.exports = {
    createProposal: createProposal,
    testProposal: testProposal,
    testUsdPlus: testUsdPlus,
    testStrategy: testStrategy,
    getProposalState: getProposalState,
}
