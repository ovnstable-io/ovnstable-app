const { deployProxy, deployProxyMulti } = require('@overnight-contracts/common/utils/deployProxy');
const { deploySection, settingSection } = require('@overnight-contracts/common/utils/script-utils');
const { BASE } = require('@overnight-contracts/common/utils/assets');

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async name => {
        await deployProxyMulti(name, 'StrategySwapToOvn', deployments, save);
    });

    await settingSection('', async strategy => {
        await (await strategy.setParams(await getParams())).wait();
        await (await strategy.setStrategyName("StrategySwapToOvn")).wait();

    });
};

async function getParams() {
    return {
        usdPlus: BASE.usdPlus,
        ovn: BASE.ovn,
        inchSwapper: BASE.inchSwapper,
        aerodromeRouter: BASE.aerodromeRouter,
        ovnUsdPlusPool: "0x61366A4e6b1DB1b85DD701f2f4BFa275EF271197", // vAMM-OVN/USD+ Basic Volatile 1.0%
        slippageBp: 100
    };
}

module.exports.tags = ['StrategySwapToOvn'];
module.exports.strategySwapToOvnParams = getParams;
