const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let arrakisRouter = "0x86D62A8AD19998E315e6242b63eB73F391D4674B";
let arrakisRewards = "0x87c7c885365700D157cd0f39a7803320fe86f0f5";
let arrakisVault = "0x632336474f5Bf11aEbECd63B84A0a2800B99a490";
let beethovenxVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let beethovenxPoolIdDai = "0x62ec8b26c08ffe504f22390a65e6e3c1e45e987700000000000000000000007e";
let beethovenxPoolIdDaiUsdtUsdc = "0x428e1cc3099cf461b87d124957a0d48273f334b100000000000000000000007f";
let beethovenxPoolIdUsdc = "0xedcfaf390906a8f91fb35b7bac23f3111dbaee1c00000000000000000000007c";
let bbRfADai = "0x62eC8b26C08Ffe504F22390A65e6E3c1e45E9877";
let bbRfAUsdc = "0xEdcfaF390906a8f91fb35B7bAC23f3111dBaEe1C";
let poolWethOpFee = 500; // 0.05%
let poolWethDaiFee = 500; // 0.05%
let kyberSwapRouter = "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83";
let poolUsdcDaiFee = 8; // 0.008%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                dai: OPTIMISM.dai,
                usdc: OPTIMISM.usdc,
                op: OPTIMISM.op,
                weth: OPTIMISM.weth,
                arrakisRouter: arrakisRouter,
                arrakisRewards: arrakisRewards,
                arrakisVault: arrakisVault,
                beethovenxVault: beethovenxVault,
                beethovenxPoolIdDai: beethovenxPoolIdDai,
                beethovenxPoolIdDaiUsdtUsdc: beethovenxPoolIdDaiUsdtUsdc,
                beethovenxPoolIdUsdc: beethovenxPoolIdUsdc,
                bbRfADai: bbRfADai,
                bbRfAUsdc: bbRfAUsdc,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolWethOpFee: poolWethOpFee,
                poolWethDaiFee: poolWethDaiFee,
                oracleDai: OPTIMISM.oracleDai,
                oracleUsdc: OPTIMISM.oracleUsdc,
                kyberSwapRouter: kyberSwapRouter,
                poolUsdcDaiFee: poolUsdcDaiFee,
                curve3Pool: OPTIMISM.curve3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyArrakisDaiUsdc'];
