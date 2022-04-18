require('hardhat-deploy');
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

const config = require("@overnight-contracts/common/utils/hardhat-config");



module.exports = {

    namedAccounts: config.namedAccounts,
    networks: config.getNetwork('POLYGON'),
    solidity: config.solidity,
    etherscan: config.etherscan(),
    mocha: config.mocha,
    gasReporter: config.gasReport

};
