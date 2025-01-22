const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    const usdPlusToken = await getContract("UsdPlusToken");
    let roleManager = await getContract('RoleManager');

    let params;

    if (hre.network.name === "optimism_dai") {
        params = {args: [usdPlusToken.address, "Wrapped DAI+", "wDAI+", 18, roleManager.address]};
    } else if (hre.network.name === "base_ovn") {
        params = {args: [usdPlusToken.address, "Wrapped OVN+", "wOVN+", 18, roleManager.address]};
    } else if (hre.network.name === "arbitrum_dai") {
        params = {args: [usdPlusToken.address, "Wrapped DAI+", "wDAI+", 18, roleManager.address]};
    } else if (hre.network.name === "arbitrum_eth") {
        params = {args: [usdPlusToken.address, "Wrapped ETH+", "wETH+", 18, roleManager.address]};
    } else if (hre.network.name === "bsc_usdt") {
        params = {args: [usdPlusToken.address, "Wrapped USDT+", "wUSDT+", 18, roleManager.address]};
    } else {
        params = {args: [usdPlusToken.address, "Wrapped USD+", "wUSD+", 6, roleManager.address]};
    }

    await deployProxy('WrappedUsdPlusToken', deployments, save, params);

    console.log("WrappedUsdPlusToken created");

    let wrappedUsdPlusToken = await ethers.getContract('WrappedUsdPlusToken');

    if (await wrappedUsdPlusToken.roleManager() === ZERO_ADDRESS){

        let roleManager = await getContract('RoleManager');
        await (await wrappedUsdPlusToken.setRoleManager(roleManager.address)).wait();
        console.log(`wrapped.setRoleManager(${roleManager.address}) done()`);
    }

    if (hre.ovn.verify){
        await hre.run("verify:verify", {
            address: wrappedUsdPlusToken.address,
            constructorArguments: params.args,
        });
    }

    console.log('WrappedUsdPlusToken deploy done()');
    console.log('Symbol:      ' + await wrappedUsdPlusToken.symbol());
    console.log('Name:        ' + await wrappedUsdPlusToken.name());
    console.log('Decimals:    ' + await wrappedUsdPlusToken.decimals());
    console.log('RoleManager: ' + await wrappedUsdPlusToken.roleManager());
};

module.exports.tags = ['base', 'WrappedUsdPlusToken'];
