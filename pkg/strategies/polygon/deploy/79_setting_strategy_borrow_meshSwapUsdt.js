const {ethers} = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let meshToken = '0x82362Ec182Db3Cf7829014Bc61E9BE8a2E82868a';
let meshSwapUsdt = '0x782D7eC740d997445D62e4463ce64C67c7484497';
let meshSwapRouter = '0x10f4A785F458Bc144e3706575924889954946639';
let eModeCategoryId = 1;
let liquidationThreshold = 975;
let healthFactor = 1026;

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyBorrowMeshSwapUsdt");

    await (await strategy.setTokens(
        POLYGON.usdc,
        POLYGON.usdt,
        POLYGON.amUsdc,
        meshToken)).wait();
    await (await strategy.setParams(
        meshSwapUsdt,
        meshSwapRouter,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdUsdcTusdDaiUsdt)).wait();
    await (await strategy.setAaveParams(
        POLYGON.aaveProvider,
        POLYGON.oracleChainlinkUsdc,
        POLYGON.oracleChainlinkUsdt,
        eModeCategoryId,
        liquidationThreshold,
        healthFactor)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyBorrowMeshSwapUsdt setting done');
};

module.exports.tags = ['setting', 'StrategyBorrowMeshSwapUsdtSetting'];
