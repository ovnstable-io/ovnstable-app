require('hardhat-deploy');
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require('@overnight-contracts/common/utils/hardhat-ovn');
require('hardhat-contract-sizer');
const config = require("@overnight-contracts/common/utils/hardhat-config");

module.exports = {
    namedAccounts: config.namedAccounts,
    networks: config.getNetworks(),
    solidity: config.solidity,
    etherscan: config.etherscan(),
    mocha: config.mocha,
    gasReporter: config.gasReport
};
