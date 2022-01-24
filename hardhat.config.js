require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ganache");
require('hardhat-deploy');
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("hardhat-tracer");


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

const {node_url, accounts} = require("./utils/network");


module.exports = {


    namedAccounts: {
        deployer: {
            default: 0,
            polygon: "0x5CB01385d3097b6a189d1ac8BA3364D900666445",
            ganache: "0xa0df350d2637096571F7A701CBc1C5fdE30dF76A"
        },

        recipient: {
            default: 1,
        },

        anotherAccount: {
            default: 2
        }
    },

    networks: {

        polygon: {
            url: node_url('polygon'),
            accounts: accounts('polygon'),
            gasPrice: 100000000000
        },

        polygon_dev: {
            url: node_url('polygon'),
            accounts: accounts('polygon'),
            gasPrice: "auto",
        },

        ganache:{
            url: "http://127.0.0.1:8555",
            chainId: 1337
        },

        hardhat: {
            forking: {
                url: "https://polygon-mainnet.infura.io/v3/66f5eb50848f458cb0f0506cc1036fea",
                blockNumber: 23554341 ,
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            },
            timeout: 36200000
        },

    },

    solidity: {
        version: "0.8.6",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },


    mocha: {
        timeout: 36200000,
        reporter:  "utils/reporter-mocha.js",
        "reporter-option": [
            "output=report.json"
        ]
    },

    gasReporter: {
        enabled: false, // Gas Reporter hides unit-test-mocha report
        currency: 'MATIC',
        gasPrice: 70,
        outputFile: 'gas-report'
    }

};
