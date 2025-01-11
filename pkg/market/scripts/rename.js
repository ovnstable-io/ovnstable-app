const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {fromAsset, toAsset} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let wUsdPlus = await getContract('WrappedCrossUsdPlusToken');

    console.log('Symbol:      ' + await wUsdPlus.symbol());
    console.log('Name:        ' + await wUsdPlus.name());

    await (await wUsdPlus.rename()).wait();

    console.log('Symbol:      ' + await wUsdPlus.symbol());
    console.log('Name:        ' + await wUsdPlus.name());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
