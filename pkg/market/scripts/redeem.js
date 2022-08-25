const {getContract, initWallet, getPrice, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");
const {toE6} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let exchanger = await getContract('HedgeExchangerUsdPlusWbnb');
    let rebase = await getContract('RebaseTokenUsdPlusWbnb');

    await showHedgeM2M();

    let params = await getPrice();
    await (await rebase.approve(exchanger.address, toE6(1), params)).wait();
    await (await exchanger.redeem(toE6(1), params)).wait();

    await showHedgeM2M();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
