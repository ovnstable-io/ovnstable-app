const hre = require("hardhat");
const {
    getContract,
    showM2M,
    execTimelock,
} = require("@overnight-contracts/common/utils/script-utils");
const {
    createProposal,
    testProposal,
    testUsdPlus,
    testStrategy,
} = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require("path");
const {
    prepareEnvironment,
} = require("@overnight-contracts/common/utils/tests");
const {
    strategySiloUsdc,
} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];
    const time = "0xD09ea5E276a84Fa73AE14Ae794524558d43F7fdC";

    let exchange = await getContract("Exchange", "zksync");
    let usdPlus = await getContract("UsdPlusToken", "zksync");

    const exMethodsAbi = [
        {
            type: "function",
            stateMutability: "nonpayable",
            name: "setPayoutManager",
            inputs: [{ type: "address" }],
        },
    ];
    let exContract = new ethers.Contract(
        exchange.address,
        exMethodsAbi,
        ethers.provider.getSigner(time),
    );

    const migMethodsAbi = [
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_exchange",
                    type: "address",
                },
                {
                    internalType: "uint8",
                    name: "decimals",
                    type: "uint8",
                },
                {
                    internalType: "address",
                    name: "_payoutManager",
                    type: "address",
                },
            ],
            name: "migrationInit",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_roleManager",
                    type: "address",
                },
            ],
            name: "setRoleManager",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_payoutManager",
                    type: "address",
                },
            ],
            name: "setPayoutManager",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
    ];
    let migContract = new ethers.Contract(
        usdPlus.address,
        migMethodsAbi,
        ethers.provider.getSigner(time),
    );

    let decimals = await usdPlus.decimals();

    let usdPlusMigrationAddress = "0x7F7D9c7861761b9F056b163034125060839F6B7b";
    let usdPlusPureAddress = "0x01617c1FB5B5Dae0CDF315c46c9D9edFac8475fF";
    let exchangeAddress = "0x326A9D77a0e03678C0d8a6DeB6D5109246F25009";
    const roleManagerAddress = (await getContract("RoleManager")).address;
    const payoutManagerAddress = (await getContract("ZkSyncPayoutManager"))
        .address;

    addProposalItem(exchange, "upgradeTo", [exchangeAddress]);
    addProposalItem(exContract, "setPayoutManager", [payoutManagerAddress]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusMigrationAddress]);
    addProposalItem(migContract, "migrationInit", [
        exchange.address,
        decimals,
        payoutManagerAddress,
    ]);
    addProposalItem(usdPlus, "upgradeTo", [usdPlusPureAddress]);
    addProposalItem(migContract, "setRoleManager", [roleManagerAddress]);
    addProposalItem(migContract, "setPayoutManager", [payoutManagerAddress]);

    // await testStrategy(filename, strategy, "zksync");
    await testUsdPlus(filename, "zksync");
    // await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
