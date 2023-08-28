const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BASE} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        dai: BASE.dai,
        usdbc: BASE.usdbc,
        well: BASE.well,
        weth: BASE.weth,
        mDai: BASE.moonwellDai,
        unitroller: BASE.moonwellUnitroller,
        balancerVault: BASE.balancerVault,
        poolIdWellWeth: '0xfab10dd71e11d0ad403cc31418b45d816f2f988200020000000000000000001d',
        uniswapV3Router: BASE.uniswapV3Router,
        poolFeeWethUsdbc: 500, // 0.05%
        poolFeeUsdbcDai: 100, // 0.01%
    }
}

module.exports.tags = ['StrategyMoonwellDai'];
module.exports.strategyMoonwellDaiParams = getParams;