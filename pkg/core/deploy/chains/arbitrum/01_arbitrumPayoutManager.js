const { deployProxy } = require('@overnight-contracts/common/utils/deployProxy');
const { ethers } = require('hardhat');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const { getContract, transferETH } = require('@overnight-contracts/common/utils/script-utils');
const { COMMON } = require('@overnight-contracts/common/utils/assets');
const hre = require('hardhat');

module.exports = async ({ deployments }) => {
    const { save } = deployments;
    await deployProxy('ArbitrumPayoutManager', deployments, save);

    if (hre.ovn && hre.ovn.setting) {
        let roleManager = await ethers.getContract('RoleManager');
        let payoutManager = await ethers.getContract('ArbitrumPayoutManager');

        await (await payoutManager.setRoleManager(roleManager.address)).wait();
        await (await payoutManager.setRewardWallet(COMMON.rewardWallet)).wait();
        console.log('setRoleManager done()');

        let exchangeUsdPlus = await getContract('Exchange', 'arbitrum');
        let exchangeDaiPlus = await getContract('Exchange', 'arbitrum_dai');
        let exchangeEthPlus = await getContract('Exchange', 'arbitrum_eth');
        let exchangeUsdtPlus = await getContract('Exchange', 'arbitrum_usdt');
        await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeUsdPlus.address)).wait();
        await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeDaiPlus.address)).wait();
        await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeEthPlus.address)).wait();
        await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeUsdtPlus.address)).wait();
        console.log('EXCHANGER role done()');
    }
};

module.exports.tags = ['ArbitrumPayoutManager'];
