const {getContract, showM2M, execTimelock, getERC20ByAddress, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18, toE6, toE18} = require("@overnight-contracts/common/utils/decimals");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

async function main() {

    let strategy = await getContract('StrategyWombatOvnDaiPlus', 'localhost');
    let pm = await getContract('PortfolioManager', 'arbitrum_dai');

    let exchangeUsdPlus = await getContract('Exchange', 'arbitrum');
    let exchangeDaiPlus = await getContract('Exchange', 'arbitrum_dai');


    console.log('NAV: ' + fromE18(await strategy.netAssetValue()));
    console.log('LIQ: ' + fromE18(await strategy.liquidationValue()));
    // await execTimelock(async (timelock)=>{
    //
    //     await strategy.connect(timelock).setPortfolioManager(pm.address);
    //
    //     await exchangeUsdPlus.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
    //     await exchangeDaiPlus.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
    //     await pm.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
    //     await exchangeDaiPlus.connect(timelock).setBlockGetter(ZERO_ADDRESS);
    //     await exchangeUsdPlus.connect(timelock).setBlockGetter(ZERO_ADDRESS);
    //
    //
    //     await exchangeUsdPlus.connect(timelock).grantRole(Roles.FREE_RIDER_ROLE, strategy.address);
    //     await exchangeDaiPlus.connect(timelock).grantRole(Roles.FREE_RIDER_ROLE, strategy.address);
    //
    //     await strategy.connect(timelock).unstakeAmount(toE18(100_000));
    // });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

