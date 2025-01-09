const {ethers} = require("hardhat");

const {initWallet, getContract, getCoreAsset} = require("@overnight-contracts/common/utils/script-utils");
const {COMMON} = require("@overnight-contracts/common/utils/assets");

module.exports = async () => {

    let wallet = await initWallet();
    const exchange = await ethers.getContract("Exchange", wallet);
    const usdPlus = await ethers.getContract("UsdPlusToken", wallet);
    const m2m = await ethers.getContract("Mark2Market", wallet);
    const pm = await ethers.getContract("PortfolioManager", wallet);
    const roleManager = await getContract("RoleManager");
    const payoutManager = await getContract("SonicPayoutManager"); // change for needed payout manager

    let asset = await getCoreAsset();

    console.log("exchange.setToken: usdPlus " + usdPlus.address + " asset: " + asset.address);
    await (await exchange.setTokens(usdPlus.address, asset.address)).wait();
    console.log("exchange.setTokens done");

    // setup exchange
    console.log("exchange.setPortfolioManager: " + pm.address);
    await (await exchange.setPortfolioManager(pm.address)).wait();
    console.log("exchange.setPortfolioManager done");

    console.log("exchange.setMark2Market: " + m2m.address);
    await (await exchange.setMark2Market(m2m.address)).wait();
    console.log("exchange.setMark2Market done");

    await (await exchange.setInsurance(COMMON.rewardWallet)).wait();
    console.log("exchange.setInsurance done");

    await (await exchange.setRoleManager(roleManager.address)).wait();
    console.log("exchange.setRoleManager done");

    console.log(`exchange.setPayoutManager: ${payoutManager.address}`);
    await (await exchange.setPayoutManager(payoutManager.address)).wait();
    console.log('exchange.setPayoutManager done');

    console.log(`exchange.setProfitRecipient: ${COMMON.rewardWallet}`);
    await (await exchange.setProfitRecipient(COMMON.rewardWallet)).wait();
    console.log('exchange.setProfitRecipient done');

};

module.exports.tags = ['setting', 'SettingExchange'];
