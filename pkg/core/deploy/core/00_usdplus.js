const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { transferETH, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { ethers } = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;
    if (hre.network.name === "localhost") await transferETH(1, await getWalletAddress());
    let params;
    switch (hre.ovn.stand || process.env.STAND) {
        case "optimism_dai":
        case "arbitrum_dai":
        case "base_dai":
            params = { args: ["DAI+", "DAI+", 18] };
            break;
        case "arbitrum_eth":
            params = { args: ["ETH+", "ETH+", 18] };
            break;
        case "bsc_usdt":
            params = { args: ["USDT+", "USDT+", 18] };
            break;
        case "linea_usdt":
        case "arbitrum_usdt":
        case "zksync_usdt":
            params = { args: ["USDT+", "USDT+", 6] };
            break;
        case "base_usdc":
            params = { args: ["USDC+", "USDC+", 6] };
            break;
        case "base_ovn":
            params = { args: ["OVN+", "OVN+", 18] };
            break;    
        case "blast":
            params = { args: ["USD+", "USD+", 18] };
            break;
        case "blast_usdc":
            params = { args: ["USDC+", "USDC+", 18] };
            break;
        default:
            params = { args: ["USD+", "USD+", 6] };
    }
    await deployProxy("UsdPlusToken", deployments, save, params);

    let usdPlus = await ethers.getContract("UsdPlusToken");

    console.log("UsdPlusToken deploy done()");
    console.log("Symbol:      " + (await usdPlus.symbol()));
    console.log("Name:        " + (await usdPlus.name()));
    console.log("Decimals:    " + (await usdPlus.decimals()));
    console.log("totalSupply: " + (await usdPlus.totalSupply()));
};

module.exports.tags = ["base", "UsdPlusToken"];
