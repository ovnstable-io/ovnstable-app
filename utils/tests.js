const dotenv = require('dotenv');
dotenv.config();

const { expect } = require('chai');
const hre = require("hardhat");

const {node_url, blockNumber} = require("../utils/network");

function greatLess(balance, value, delta, msg) {
  expect(balance).to.greaterThanOrEqual(value - delta, msg);
  expect(balance).to.lessThanOrEqual(value + delta, msg);
}

async function resetHardhat(){

  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: node_url('polygon'),
          blockNumber: blockNumber(),
        },
      },
    ],
  });


  console.log('execute: hardhat_reset');
}


const fs = require("fs-extra")

async function prepareArtifacts(){
  const srcDir = `./artifacts-external`;
  const destDir = `./artifacts`;

  await fs.copy(srcDir, destDir, function (err) {
    if (err){
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
