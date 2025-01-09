const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {COMMON} = require("@overnight-contracts/common/utils/assets");


/**
 * Script set up after deploy USD+ to new Chain
 * Add roles PM, UNIT to particular addresses
 */

async function main() {

    let wallet = await initWallet();
    let exchange = await getContract('Exchange');
    let pm = await getContract('PortfolioManager');

    // // Change to needed chain contracts
    // let blockGetter = await getContract('ArbitrumBlockGetter', 'arbitrum');
    // await (await exchange.setBlockGetter(blockGetter.address)).wait(); // BlockGetter

    // let pl = await getContract('ArbitrumPayoutListener', 'arbitrum');
    ///await (await pl.grantRole(Roles.EXCHANGER, exchange.address)).wait();
    //await (await exchange.setPayoutListener(pl.address)).wait(); // PayoutListener
    await (await exchange.setProfitRecipient(COMMON.rewardWallet)).wait(); // ovn reward wallet

    //await (await exchange.setAbroad(1000100, 1000360)).wait();
    await (await exchange.setOracleLoss(100, 100000)).wait();
    await (await exchange.setCompensateLoss(0, 100000)).wait();

    console.log('Base-setting done()');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

