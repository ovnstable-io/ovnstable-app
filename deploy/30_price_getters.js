const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";
let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let balancerPool1 = "0x614b5038611729ed49e0dED154d8A5d3AF9D1D9E";
let balancerPool2 = "0x0297e37f1873D2DAb4487Aa67cD56B58E2F27875";
let balancerPoolId1 = "0x614b5038611729ed49e0ded154d8a5d3af9d1d9e00010000000000000000001d";
let balancerPoolId2 = "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('IdleUsdcPriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('UsdcPriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('AUsdcPriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('A3CrvPriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('A3CrvGaugePriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('CrvPriceGetter', {
        from: deployer,
        args: [swapRouter, assets.usdc, assets.crv],
        log: true,
    });

    await deploy('WMaticPriceGetter', {
        from: deployer,
        args: [swapRouter, assets.usdc, assets.wMatic],
        log: true,
    });

    await deploy('VimUsdPriceGetter', {
        from: deployer,
        args: [assets.usdc, assets.mUsd, assets.imUsd],
        log: true,
    });

    await deploy('MtaPriceGetter', {
        from: deployer,
        args: [balancerVault, assets.usdc, assets.wMatic, assets.mta, balancerPool1, balancerPool2, balancerPoolId1, balancerPoolId2],
        log: true,
    });
};

module.exports.tags = ['base', 'price-getters'];

