const {getContract, changeWeightsAndBalance, getPrice, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {
    let cashStrategy = await getContract('StrategySwapToOvn');

    let weights = [
        {
            "strategy": cashStrategy.address,
            "minWeight": 0,
            "targetWeight": 100,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": true,
            "enabledReward": false
        }
    ]

    weights = await convertWeights(weights);

    await showM2M();

    let pm = await getContract('PortfolioManager');
    let rm = await getContract('RoleManager');

    await (await pm.setCashStrategy(cashStrategy.address)).wait();
    await (await pm.addStrategy(cashStrategy.address)).wait();
    await (await pm.setStrategyWeights(weights)).wait();

    await showM2M();
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
