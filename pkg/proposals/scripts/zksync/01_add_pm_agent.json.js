const hre = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'zksync');

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('grantRole', [Roles.PORTFOLIO_AGENT_ROLE, '0xdf5D41F42f5E4571b35A6A3cdaB994e9B433Fe66']));

    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

