const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus } = require("@overnight-contracts/common/utils/governance");
const { COMMON } = require('@overnight-contracts/common/utils/assets');

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

const OPERATIONS = {
    REINVEST : 0,
    SEND : 1,
    CUSTOM: 2
}

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    const SwapSimulatorFenix = await getContract('SwapSimulatorFenix', 'blast');
    const newSwapSimulatorFenixImpl = "0x3d4eE55c0b6E2644e634A99A8be16d26D95dc6f8";

    const StrategyFenixSwap = await getContract('StrategyFenixSwap', 'blast');
    const newFenixSwapImpl = "0x0C7c6E0264A6f22E494f78283b06Fc6E996105ed";

    addProposalItem(SwapSimulatorFenix, 'upgradeTo', [newSwapSimulatorFenixImpl]);
    addProposalItem(StrategyFenixSwap, 'upgradeTo', [newFenixSwapImpl]);
    addProposalItem(StrategyFenixSwap, 'setParams', [await getParams()]);
    addProposalItem(StrategyFenixSwap, 'setClaimConfig', [await getConfig()]);


    // await testProposal(addresses, values, abis);

    // await testUsdPlus(filename, 'blast');
    // await testUsdPlus(filename, 'blast_usdc');

    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

async function getParams() {
    return {
        pool: '0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f',
        binSearchIterations: 20,
        swapSimulatorAddress: '0xD34063601f4f512bAB89c0c0bF8aa947cAa55885',
        npmAddress: '0x8881b3fb762d1d50e6172f621f107e24299aa1cd', 
        lowerTick: -1,
        upperTick: 0,
        fnxTokenAddress: '0x52f847356b38720b55ee18cb3e094ca11c85a192',
        wethTokenAddress: '0x4300000000000000000000000000000000000004',
        poolFnxUsdb: '0xb3B4484bdFb6885f96421c3399B666a1c9D27Fca',
        poolFnxWeth: '0x2e3281E50479d6C42328bA6F2E4aFd971e43Ca2d',
        poolUsdbWeth: '0x1D74611f3EF04E7252f7651526711a937Aa1f75e',
        rewardSwapSlippageBP: 500,
        liquidityDecreaseDeviationBP: 500
    };
}

async function getConfig() {
    return {
        operation: OPERATIONS.SEND,
        beneficiary: COMMON.rewardWallet,
        distributor: "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae",
        __gap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
