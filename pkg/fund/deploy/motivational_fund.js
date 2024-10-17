const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { transferETH, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { ethers } = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;
    if (hre.network.name === "localhost") await transferETH(1, await getWalletAddress());
    let params = { args: ["MotivationalFund", "FUND", 6] };
    
    await deployProxy("MotivationalFund", deployments, save, params);

    let usdPlus = await ethers.getContract("MotivationalFund");

    console.log("MotivationalFund deploy done()");
    console.log("Symbol:      " + (await usdPlus.symbol()));
    console.log("Name:        " + (await usdPlus.name()));
    console.log("Decimals:    " + (await usdPlus.decimals()));
    console.log("totalSupply: " + (await usdPlus.totalSupply()));
};

module.exports.tags = ["MotivationalFund"];
