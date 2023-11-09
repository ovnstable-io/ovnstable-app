const {ethers} = require("hardhat");

let { BSC, OPTIMISM, ARBITRUM, BASE, LINEA, getAsset} = require('@overnight-contracts/common/utils/assets');
const hre = require("hardhat");
const {initWallet} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async () => {

    let wallet = await initWallet();

    const pm = await ethers.getContract("PortfolioManager", wallet);
    const exchange = await ethers.getContract("Exchange", wallet);
    const m2m = await ethers.getContract("Mark2Market", wallet);
    const roleManager = await ethers.getContract("RoleManager", wallet);

    let asset;
    if (hre.network.name === "optimism_dai") {
        asset = OPTIMISM.dai;
    } else if (hre.network.name === "arbitrum_dai") {
        asset = ARBITRUM.dai;
    } else if (hre.network.name === "arbitrum_eth") {
        asset = ARBITRUM.weth;
    } else if (hre.network.name === "bsc_usdt") {
        asset = BSC.usdt;
    } else if (hre.network.name === "arbitrum_usdt") {
        asset = ARBITRUM.usdt;
    } else if (hre.network.name === "base_dai") {
        asset = BASE.dai;
    } else if(hre.network.name === "linea_usdt"){
        asset = LINEA.usdt;
    } else {
        asset = getAsset('usdc');
    }

    await (await pm.setMark2Market(m2m.address)).wait();
    console.log("pm.setMark2Market done");

    await (await pm.setExchanger(exchange.address)).wait();
    console.log("pm.setExchanger done");

    await (await pm.setAsset(asset)).wait();
    console.log("pm.setAsset done");

    tx = await exchange.setRoleManager(roleManager.address);
    await tx.wait();
    console.log("exchange.setRoleManager done");

};

module.exports.tags = ['setting', 'SettingPM'];

