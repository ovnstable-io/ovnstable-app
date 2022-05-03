const {ethers} = require("hardhat");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const exchange = await ethers.getContract("Exchange");
    const usdPlus = await ethers.getContract("UsdPlusToken");
    const m2m = await ethers.getContract("Mark2Market");
    const pm = await ethers.getContract("PortfolioManager");
    const polygonPL = await ethers.getContract("PolygonPayoutListener");

    console.log("exchange.setToken: usdPlus " + usdPlus.address + " usdc: " + DEFAULT.usdc);
    let tx = await exchange.setTokens(usdPlus.address, DEFAULT.usdc);
    await tx.wait();
    console.log("exchange.setTokens done");

    // setup exchange
    console.log("exchange.setPortfolioManager: " + pm.address);
    tx = await exchange.setPortfolioManager(pm.address);
    await tx.wait();
    console.log("exchange.setPortfolioManager done");

    console.log("exchange.setMark2Market: " + m2m.address);
    tx = await exchange.setMark2Market(m2m.address);
    await tx.wait();
    console.log("exchange.setMark2Market done");

    console.log("exchange.setPayoutListener: " + polygonPL.address);
    tx = await exchange.setPayoutListener(polygonPL.address);
    await tx.wait();
    console.log("exchange.setPayoutListener done");
};

module.exports.tags = ['setting', 'SettingExchange'];
