const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let roleManager = {address:ZERO_ADDRESS};//await getContract('RoleManager');
    let params = {args: [ZERO_ADDRESS, "Wrapped xUSD", "wxUSD", 6, roleManager.address]};

    await deployProxy('WrappedCrossUsdPlusToken', deployments, save, params);
    console.log("WrappedCrossUsdPlusToken created");

    let wrappedCrossUsdPlusToken = await ethers.getContract('WrappedCrossUsdPlusToken');

    await hre.run("verify:verify", {
        address: wrappedCrossUsdPlusToken.address,
        // constructorArguments: params.args,
    });

    console.log('WrappedCrossUsdPlusToken deploy done()');
    console.log('Symbol:      ' + await wrappedCrossUsdPlusToken.symbol());
    console.log('Name:        ' + await wrappedCrossUsdPlusToken.name());
    console.log('Decimals:    ' + await wrappedCrossUsdPlusToken.decimals());
    console.log('RoleManager: ' + await wrappedCrossUsdPlusToken.roleManager());
};

module.exports.tags = ['base', 'WrappedCrossUsdPlusToken'];
