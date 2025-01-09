const { deployProxy, deployProxyMulti } = require('@overnight-contracts/common/utils/deployProxy');
const { deploySection, settingSection } = require('@overnight-contracts/common/utils/script-utils');
const { SONIC } = require('@overnight-contracts/common/utils/assets');

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async name => {
        await deployProxyMulti(name, 'StrategyDummyHold', deployments, save);
    });

    await settingSection('', async strategy => {
        await (await strategy.setParams(await getParams())).wait();
        await (await strategy.setStrategyName("DummyHoldStrategy")).wait();
        
    });
};

async function getParams() {
    return {
        usdc: SONIC.usdcBridged
    };
}

module.exports.tags = ['StrategyDummyHold'];
module.exports.strategyDummyHoldParams = getParams;
