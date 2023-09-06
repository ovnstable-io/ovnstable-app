const dotenv = require('dotenv');

console.log('Process:' + process.cwd());
dotenv.config({path:__dirname+ '/../../../.env'});

const {node_url, accounts, blockNumber, isZkSync} = require("./network");
const {getGasPrice} = require("./network");
let gasPrice = getGasPrice();

let timeout = 362000000;

function getNetworkByName(network) {

    let forkingUrl = node_url(network);
    let accountsNetwork = accounts(network);
    let blockNumberValue = blockNumber(network);
    console.log(`[Node] Forking url: [${forkingUrl}:${blockNumberValue}]`);

    let zkSync = isZkSync();

    let localhost;
    if (zkSync){
        localhost = {
            // Use local node zkSync for testing
            url: 'http://localhost:8011',
            timeout: timeout,
            accounts: accountsNetwork,
            zksync: true,
            ethNetwork: "http://localhost:8545",
        }
    }else {
        localhost = {
            timeout: timeout,
            accounts: accountsNetwork,
            zksync: false,
        }
    }

    return {

        base: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
            zksync: false,
        },

        base_dai: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
            zksync: false,
        },

        linea_usdt: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: 'auto',
            zksync: false,
        },


        linea: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: 'auto',
            zksync: false,
        },

        arbitrum: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
            zksync: false,
        },

        arbitrum_dai: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
            zksync: false,
        },

        zksync: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
            ethNetwork: "mainnet",
            zksync: true,
        },

        optimism: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: 'auto',
            zksync: false,
        },

        optimism_dai: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
            zksync: false,
        },

        bsc: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
            zksync: false,
        },

        bsc_usdt: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },


        polygon: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
            zksync: false,
        },

        polygon_ins: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
            zksync: false,
        },

        localhost: localhost,

        hardhat: {
            zksync: zkSync,
            forking: {
                url: forkingUrl,
                blockNumber: blockNumberValue,
                ignoreUnknownTxType: true,
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            },
            timeout: timeout
        },
    }
}

function getNetwork(network) {
    console.log(`[Node] Network: [${network}]`);
    return getNetworkByName(network.toLowerCase());
}

let namedAccounts = {
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
}

let zksolc = {
    version: "1.3.5",
    compilerSource: "binary",
    settings: {},
}

let solidity = {
    version: "0.8.17",
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
}

let mocha = require("./mocha-report-setting")
const {setDefault} = require("./assets");

let gasReport = {
    enabled: false, // Gas Reporter hides unit-test-mocha report
    currency: 'MATIC',
    gasPrice: 70,
    outputFile: 'gas-report'
}

function getEtherScan(chain){
    if (!chain) {
        chain = process.env.ETH_NETWORK
    }

    let object = {

        customChains: [
            {
                network: "base",
                chainId:  8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org"
                }
            },
            {
                network: "base_dai",
                chainId:  8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org"
                }
            },
            {
                network: "linea",
                chainId:  59144,
                urls: {
                    apiURL: "https://api.lineascan.build/api",
                    browserURL: "https://lineascan.build"
                }
            },
            {
                network: "linea_usdt",
                chainId:  59144,
                urls: {
                    apiURL: "https://api.lineascan.build/api",
                    browserURL: "https://lineascan.build"
                }
            }
        ]

    };

    let api = process.env[`ETHERSCAN_API_${chain.toUpperCase()}`];

    if (api){
        object.apiKey = api;
    }else {
        throw new Error('Not defined env: ' + `ETHERSCAN_API_${chain.toUpperCase()}`);
    }

    return object;
}

module.exports = {
    getNetwork: getNetwork,
    namedAccounts: namedAccounts,
    solidity: solidity,
    zksolc: zksolc,
    mocha: mocha,
    gasReport: gasReport,
    etherscan: getEtherScan
};
