const { ethers } = require("hardhat");
const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {Wallet} = require("zksync-web3");

const hre = require('hardhat');
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const wallet = await initWallet();

    const usdPlus = await ethers.getContract("UsdPlusToken", wallet);
    const exchange = await ethers.getContract("Exchange", wallet);
    const roleManager = await getContract("RoleManager");
    //const payoutManager = await getContract("BaseOvnPayoutManager");  // change for needed payout manager

    console.log('usdPlus.setExchanger: ' + exchange.address)
    await (await usdPlus.setExchanger(exchange.address)).wait();
    console.log("usdPlus.setExchanger done");

    // console.log(`usdPlus.setPayoutManager: ${payoutManager.address}`);
    // await (await usdPlus.setPayoutManager(payoutManager.address)).wait();
    // console.log('usdPlus.setPayoutManager done');

    console.log(`usdPlus.setRoleManager: ${roleManager.address}`);
    await (await usdPlus.setRoleManager(roleManager.address)).wait();
    console.log('usdPlus.setRoleManager done');
};

module.exports.tags = ['setting','SettingUsdPlusToken'];
