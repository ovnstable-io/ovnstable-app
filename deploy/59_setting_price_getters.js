const { ethers } = require("hardhat");

let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351"
let idleToken = "0x1ee6470CD75D5686d0b2b90C0305Fa46fb0C89A1";

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const idleUsdcPriceGetter = await ethers.getContract('IdleUsdcPriceGetter');
    const usdcPriceGetter = await ethers.getContract('UsdcPriceGetter');
    const aUsdcPriceGetter = await ethers.getContract('AUsdcPriceGetter');
    const a3CrvPriceGetter = await ethers.getContract('A3CrvPriceGetter');
    const a3CrvGaugePriceGetter = await ethers.getContract('A3CrvGaugePriceGetter');
    const crvPriceGetter = await ethers.getContract('CrvPriceGetter');
    const wMaticPriceGetter = await ethers.getContract('WMaticPriceGetter');
    const vimUsdPriceGetter = await ethers.getContract('VimUsdPriceGetter');
    const mtaPriceGetter = await ethers.getContract('MtaPriceGetter');

    // setup price getters
    let tx = await idleUsdcPriceGetter.setIdleToken(idleToken);
    await tx.wait();
    console.log("idleUsdcPriceGetter.setIdleToken done");

    tx =await a3CrvPriceGetter.setPool(aCurvepoolStake);
    await tx.wait();
    console.log("a3CrvPriceGetter.setPool done");

    tx = await a3CrvGaugePriceGetter.setA3CrvPriceGetter(a3CrvPriceGetter.address);
    await tx.wait();
    console.log("a3CrvGaugePriceGetter.setA3CrvPriceGetter done");

    // link
    const portfolio = await ethers.getContract('Portfolio');


    // struct AssetInfo {
    //     address asset;
    //     address priceGetter;
    // }


    let idleUsdcAssetInfo = {
        asset: assets.idleUsdc,
        priceGetter: idleUsdcPriceGetter.address
    }
    let usdcAssetInfo = {
        asset: assets.usdc,
        priceGetter: usdcPriceGetter.address
    }
    let aUsdcAssetInfo = {
        asset: assets.amUsdc,
        priceGetter: aUsdcPriceGetter.address
    }
    let a3CrvAssetInfo = {
        asset: assets.am3CRV,
        priceGetter: a3CrvPriceGetter.address
    }
    let a3CrvGaugeAssetInfo = {
        asset: assets.am3CRVgauge,
        priceGetter: a3CrvGaugePriceGetter.address
    }
    let crvAssetInfo = {
        asset: assets.crv,
        priceGetter: crvPriceGetter.address
    }
    let wMaticAssetInfo = {
        asset: assets.wMatic,
        priceGetter: wMaticPriceGetter.address
    }
    let vimUsdAssetInfo = {
        asset: assets.vimUsd,
        priceGetter: vimUsdPriceGetter.address
    }
    let mtaAssetInfo = {
        asset: assets.mta,
        priceGetter: mtaPriceGetter.address
    }
    let assetInfos = [
        usdcAssetInfo,
        aUsdcAssetInfo,
        a3CrvAssetInfo,
        a3CrvGaugeAssetInfo,
        crvAssetInfo,
        wMaticAssetInfo,
        idleUsdcAssetInfo,
        vimUsdAssetInfo,
        mtaAssetInfo
    ]

    console.log("portfolio.setAssetInfo: " + JSON.stringify(assetInfos));
    tx = await portfolio.setAssetInfos(assetInfos);
    await tx.wait();
    console.log("portfolio.setAssetInfos done");

};

module.exports.tags = ['setting', 'setting-price-getters'];

