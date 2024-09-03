const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {BASE} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;
    await deployProxy('PortfolioManager', deployments, save);
};

module.exports.tags = ['PortfolioManager'];
