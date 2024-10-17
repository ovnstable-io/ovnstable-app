const { deployProxy, deployProxyMulti } = require('@overnight-contracts/common/utils/deployProxy');
const { deploySection, settingSection } = require('@overnight-contracts/common/utils/script-utils');
const { BASE } = require('@overnight-contracts/common/utils/assets');

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async name => {
        await deployProxyMulti(name, 'StrategySiloUsdc', deployments, save);
    });

    await settingSection('', async strategy => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: BASE.usdc,
        weth: BASE.weth,
        silo: '0xEB42de7d17dfAFfD03AF48c2A51c3FB7274d3396', // wstETH, WETH, USDC market
        siloIncentivesController: BASE.siloIncentivesController,
        siloLens: BASE.siloLens,
        siloToken: BASE.siloToken,        
        aerodromeRouter: BASE.aerodromeRouter,
        siloWethPool: "0x57bd5C33c8002A634b389Ab4de5e09eC1C31Dce7",
        wethUsdcPool: "0x3548029694fbB241D45FB24Ba0cd9c9d4E745f16", // sAMM-WETH/USDC 0.05%
    };
}

module.exports.tags = ['StrategySiloUsdcWstETH'];
module.exports.strategySiloUsdc = getParams;