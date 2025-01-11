const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../../../.env' });

function node_url(networkName) {
    if (networkName) {
        const uri = process.env['ETH_NODE_URI_' + networkName.toUpperCase()];
        if (uri && uri !== '') {
            return uri;
        }
    }

    let uri = process.env.ETH_NODE_URI;
    if (uri) {
        uri = uri.replace('{{networkName}}', networkName);
    }
    if (!uri || uri === '') {
        if (networkName === 'localhost') {
            // if (isZkSync()) {
            //     return 'http://localhost:8011'
            // } else {
            return 'http://localhost:8545'
            // }
        }
        return '';
    }
    if (uri.indexOf('{{') >= 0) {
        throw new Error(`invalid uri or network not supported by node provider : ${uri}`);
    }
    return uri;
}

function getPrivateKey(networkName) {
    if (networkName) {
        const pk = process.env['PK'];
        if (pk && pk !== '') {
            return pk;
        }
    }

    const pk = process.env.PK;
    if (!pk || pk === '') {
        return '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; //dev private key
    }
    return pk;
}

function accounts(networkName) {
    return [getPrivateKey(networkName)];
}

function isZkSync() {
    return process.env.STAND.toLowerCase().startsWith('zksync');
}

function getGasPrice() {
    let gasPrice = Number.parseFloat(process.env.GAS_PRICE);

    if (!gasPrice) throw new Error('Unknown gasPrice. Please specify GAS_PRICE in env');

    let wei = gasPrice * 1e9;
    console.log(`[Node] Gas price: Gwei: [${gasPrice}] Wei: [${wei}]`);

    return wei;
}

function blockNumber(networkName) {
    return Number.parseInt(process.env['HARDHAT_BLOCK_NUMBER']);
}

function getNodeUrl() {
    return node_url(process.env.ETH_NETWORK.toLowerCase());
}
function getBlockNumber() {
    return blockNumber(process.env.ETH_NETWORK.toLowerCase());
}

module.exports = {
    getNodeUrl: getNodeUrl,
    node_url: node_url,
    getGasPrice: getGasPrice,
    isZkSync: isZkSync,
    accounts: accounts,
    blockNumber: blockNumber,
    getBlockNumber: getBlockNumber,
};
