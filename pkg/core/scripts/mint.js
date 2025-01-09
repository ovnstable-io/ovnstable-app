const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");
const { engineSendTxSigned } = require("@overnight-contracts/common/utils/engine");


// engine version
/*
async function main() {
    let exchange = await getContract('Exchange');
    let asset = await getCoreAsset();

    for (let i = 0;i < 200;i++) {
        const amount = toAsset(0.001);
        let tx = await asset.populateTransaction.approve(exchange.address, amount);
        await engineSendTxSigned(tx);
        console.log(`Asset approve done ${i}`);

        tx = await exchange.populateTransaction.buy(asset.address, amount);
        await engineSendTxSigned(tx, process.env.ENGINE_BACKEND_WALLET, { gas: "1000000"});
        console.log(`Exchange.buy done ${i}`);
    }
}
*/

async function main() {

    let exchange = await getContract('Exchange');
    let asset = await getCoreAsset();

    await showM2M();

    await (await asset.approve(exchange.address, toAsset(1))).wait();
    console.log('Asset approve done');
    await (await exchange.buy(asset.address, toAsset(1))).wait(); 
    console.log('Exchange.buy done');

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

