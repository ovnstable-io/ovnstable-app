const dotenv = require('dotenv');
dotenv.config();

const { expect } = require('chai');
const hre = require("hardhat");

const fs = require("fs-extra")

const { node_url, blockNumber } = require("../utils/network");

function greatLess(value, expected, delta) {
    let maxValue = expected.plus(delta);
    let minValue = expected.minus(delta);

    expect(value.gte(minValue)).to.equal(true);
    expect(value.lte(maxValue)).to.equal(true);
}

async function resetHardhat(network) {
    let block = blockNumber(network);
    if (block == 0) {
        const provider = new ethers.providers.JsonRpcProvider(node_url(network));
        block = await provider.getBlockNumber() - 31;
    }

    await hre.network.provider.request({
        method: "hardhat_reset",
        params: [
            {
                forking: {
                    jsonRpcUrl: node_url(network),
                    blockNumber: block,
                },
            },
        ],
    });

    console.log('execute: hardhat_reset');
}

async function prepareArtifacts(){
    const srcDir = `./artifacts-external`;
    const destDir = `./artifacts`;

    await fs.copy(srcDir, destDir, function (err) {
        if (err) {
            console.log('An error occurred while copying the folder.')
            return console.error(err)
        }
    });
}

module.exports = {
    greatLess: greatLess,
    resetHardhat: resetHardhat,
    prepareArtifacts: prepareArtifacts,
}
