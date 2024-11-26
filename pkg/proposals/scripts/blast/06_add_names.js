const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'blast');
    let pm_usdc = await getContract('PortfolioManager', 'blast_usdc');

    const StrategyZerolend = await getContract('StrategyZerolend', 'blast');
    const newZerolendImpl = "0xFD40a33Bda7bD1C494A0C32f1bC96B04df305c01";

    const StrategySperAlpha = await getContract('StrategySperAlpha', 'blast');
    const newSperAlphaImpl = "0x622bC5acfA76a5B8E2BD1FA599fa31B43C1900CA";

    const StrategyZerolendUsdc = await getContract('StrategyZerolendUsdc', 'blast_usdc');
    const newZerolendUsdcImpl = "0xde48c03B452ACba30d297dF21A5C8676FeA7b3D2";

    addProposalItem(StrategyZerolend, "upgradeTo", [newZerolendImpl]);
    addProposalItem(StrategySperAlpha, "upgradeTo", [newSperAlphaImpl]);

    addProposalItem(StrategyZerolendUsdc, "upgradeTo", [newZerolendUsdcImpl]);

    addProposalItem(StrategyZerolend, 'setStrategyName', ["Zerolend USDB"]);
    addProposalItem(StrategySperAlpha, 'setStrategyName', ["SperAlphaBlast"]);

    addProposalItem(StrategyZerolendUsdc, 'setStrategyName', ["Zerolend USDB"]);

    addProposalItem(pm, 'upgradeTo', ['0xB5900912Ee8A80375f85603149693971e84C72F2']);
    addProposalItem(pm_usdc, 'upgradeTo', ['0xD55B35EaDe756b10D1c3BAf9824902f0262f1565']);


    await testProposal(addresses, values, abis);

    await testUsdPlus(filename, 'blast');
    await testUsdPlus(filename, 'blast_usdc');

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