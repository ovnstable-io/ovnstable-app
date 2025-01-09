const dotenv = require('dotenv');

console.log('Process:' + process.cwd());
dotenv.config({ path: __dirname + '/../../../.env' });

const { node_url, accounts, blockNumber, isZkSync } = require("./network");
const { getGasPrice } = require("./network");
let gasPrice = getGasPrice();

let timeout = 362000000;


class Chain {

    static get ARBITRUM() { return 'ARBITRUM'; }
    static get BASE() { return 'BASE'; }
    static get POLYGON() { return 'POLYGON'; }
    static get OPTIMISM() { return 'OPTIMISM'; }
    static get BSC() { return 'BSC'; }
    static get ZKSYNC() { return 'ZKSYNC'; }
    static get LINEA() { return 'LINEA'; }
    static get BLAST() { return 'BLAST'; }


    static get list() {
        return ['ARBITRUM', 'BASE', 'POLYGON', 'OPTIMISM', 'BSC', 'ZKSYNC', 'LINEA', 'BLAST']
    }
}



function getNetworks() {

    let accountsNetwork = accounts('polygon');

    let zkSync = isZkSync();



    let localhost;
    if (zkSync) {
        localhost = {
            // Use local node zkSync for testing
            url: 'http://localhost:8545',
            timeout: timeout,
            accounts: accountsNetwork,
            zksync: true,
            ethNetwork: "zksync",
        }
    } else {
        localhost = {
            timeout: timeout,
            accounts: accountsNetwork,
            zksync: false,
        }
    }

    return {

        base: {
            url: node_url('base'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            gas: 21000000,
            zksync: false,
        },

        base_dai: {
            url: node_url('base'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        base_usdc: {
            url: node_url('base'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        linea_usdt: {
            url: node_url('linea'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: 'auto',
            zksync: false,
        },


        linea: {
            url: node_url('linea'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            gas: 2100000,
            zksync: false,
        },

        arbitrum: {
            url: node_url('arbitrum'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            gas: 4200000,
            zksync: false,
        },

        arbitrum_eth: {
            url: node_url('arbitrum'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },


        arbitrum_dai: {
            url: node_url('arbitrum'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        arbitrum_usdt: {
            url: node_url('arbitrum'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        zksync: {
            url: node_url('zksync'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            ethNetwork: "mainnet",
            zksync: true,
        },

        zksync_usdt: {
            url: node_url('zksync'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            ethNetwork: "mainnet",
            zksync: true,
        },

        optimism: {
            url: node_url('optimism'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: 'auto',
            zksync: false,
        },

        optimism_dai: {
            url: node_url('optimism'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        bsc: {
            url: node_url('bsc'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        bsc_usdt: {
            url: node_url('bsc'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
        },


        polygon: {
            url: node_url('polygon'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        blast: {
            url: node_url('blast'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        blast_usdc: {
            url: node_url('blast'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        sonic: {
            url: node_url('sonic'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        localhost: localhost,

        hardhat: {
            zksync: false,
            forking: {
                url: node_url(process.env.ETH_NETWORK),
                blockNumber: blockNumber(process.env.ETH_NETWORK),
                ignoreUnknownTxType: true,
            },
            // uncomment to fix history error
            chains: {
                10: {
                    hardforkHistory: {
                        london: 121293553
                    }
                },
                146: {
                    hardforkHistory: {
                        london: 100
                    }
                },
                8453: {
                    hardforkHistory: {
                        london: 23352161
                    }
                },
                59144: {
                    hardforkHistory: {
                        london: 6510720
                    }
                },
                81457: {
                    hardforkHistory: {
                        london: 11662782
                    }
                }
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            },
            timeout: timeout
        },
    }
}

function getChainFromNetwork(network) {

    if (network) {

        network = network.toLowerCase();
        for (let chain of Chain.list) {

            // network can be = arbitrum_dai | optimism | base_dai ...
            // chain only = POLYGON|ARBITRUM|BASE ...

            if (network.includes(chain.toLowerCase())) {
                return chain;
            }
        }
    }

    throw new Error(`Unknown network: ${ network }`)

}


let namedAccounts = {
    deployer: {
        default: 0,
        polygon: '0xab918d486c61ADd7c577F1af938117bBD422f088',
        ganache: "0xa0df350d2637096571F7A701CBc1C5fdE30dF76A",
        arbitrum: '0xab918d486c61ADd7c577F1af938117bBD422f088',
    },

    recipient: {
        default: 1,
    },

    anotherAccount: {
        default: 2
    }
}

let zksolc = {
    version: "1.3.13",
    compilerSource: "binary",
    settings: {
        // contractsToCompile: ['Exchange']
    },
}

let solidity = {
    version: "0.8.17",
    settings: {
        optimizer: {
            enabled: true,
            runs: 100
        }
    }
}

let mocha = require("./mocha-report-setting")
const { ARBITRUM, BASE, POLYGON, OPTIMISM, BLAST } = require("./assets");
const { Wallets } = require("./wallets");

let gasReport = {
    enabled: false, // Gas Reporter hides unit-test-mocha report
    currency: 'MATIC',
    gasPrice: 70,
    outputFile: 'gas-report'
}

function getEtherScan() {

    let object = {

        customChains: [
            {
                network: "base",
                chainId: 8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org"
                }
            },
            {
                network: "base_dai",
                chainId: 8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org"
                }
            },
            {
                network: "linea",
                chainId: 59144,
                urls: {
                    apiURL: "https://api.lineascan.build/api",
                    browserURL: "https://lineascan.build"
                }
            },
            {
                network: "linea_usdt",
                chainId: 59144,
                urls: {
                    apiURL: "https://api.lineascan.build/api",
                    browserURL: "https://lineascan.build"
                }
            },
            {
                network: "arbitrum_dai",
                chainId: 42161,
                urls: {
                    apiURL: "https://api.arbiscan.io/api",
                    browserURL: "https://arbiscan.io"
                }
            },
            {
                network: "blast",
                chainId: 81457,
                urls: {
                    apiURL: "https://api.blastscan.io/api",
                    browserURL: "https://blastscan.io/"
                }
            },
            {
                network: "blast_usdc",
                chainId: 81457,
                urls: {
                    apiURL: "https://api.blastscan.io/api",
                    browserURL: "https://blastscan.io/"
                }
            },
            {
                network: "sonic",
                chainId: 146,
                urls: {
                    apiURL: "https://api.sonicscan.org/api",
                    browserURL: "https://sonicscan.org/"
                }
            },
            
        ]

    };


    // Run command to show support native chains: npx hardhat verify --list-networks
    // if plugin not support chain then add chain to customChains section
    object.apiKey = {
        base: process.env[`ETHERSCAN_API_BASE`],
        base_dai: process.env[`ETHERSCAN_API_BASE`],
        linea: process.env[`ETHERSCAN_API_LINEA`],
        linea_usdt: process.env[`ETHERSCAN_API_LINEA`],
        optimisticEthereum: process.env[`ETHERSCAN_API_OPTIMISM`],
        polygon: process.env[`ETHERSCAN_API_POLYGON`],
        bsc: process.env[`ETHERSCAN_API_BSC`],
        arbitrumOne: process.env[`ETHERSCAN_API_ARBITRUM`],
        arbitrum_dai: process.env[`ETHERSCAN_API_ARBITRUM`],
        blast: process.env[`ETHERSCAN_API_BLAST`],
        blast_usdc: process.env[`ETHERSCAN_API_BLAST`],
        sonic: process.env[`ETHERSCAN_API_SONIC`],
    }

    return object;
}

module.exports = {
    Chain: Chain,
    getChainFromNetwork: getChainFromNetwork,
    getNetworks: getNetworks,
    namedAccounts: namedAccounts,
    solidity: solidity,
    zksolc: zksolc,
    mocha: mocha,
    gasReport: gasReport,
    etherscan: getEtherScan
};
