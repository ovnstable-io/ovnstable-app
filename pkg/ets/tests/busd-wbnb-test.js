const hre = require("hardhat");
const {deployments, ethers} = require("hardhat");
const {resetHardhat} = require("@overnight-contracts/common/utils/tests");
const {toE6, toE18, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {expect} = require("chai");
const {
    sharedBeforeEach
} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const BigNumber = require('bignumber.js');
const chai = require("chai");
chai.use(require('chai-bignumber')());

const {waffle} = require("hardhat");
const {getContract, execTimelock, getERC20, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {transferETH, transferUSDPlus} = require("@overnight-contracts/common/utils/script-utils");
const {provider} = waffle;


let busd = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
let wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
let vBusdToken = '0x95c78222B3D6e262426483D42CfA53685A67Ab9D';
let vBnbToken = '0xA07c5b74C9B40447a954e1466938b865b6BBea36';
let xvsToken = '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63';
let unitroller = "0xfD36E2c2a6789Db23113685031d7F16329158384";
let maximillion = '0x5efA1e46F4Fd738FF721F5AebC895b970F13E8A1';
let oracleBusd = '0xcBb98864Ef56E9042e7d2efef76141f15731B82f';
let oracleWbnb = '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE';

let coneRouter = "0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F";
let conePair = "0x881b608ec7e15cd5bb4da9db6ae9c477b4f67731"; // WBNB-BUSD Pair
let coneVoter = "0xC3B5d80E4c094B17603Ea8Bb15d2D31ff5954aAE";
let coneToken = "0xa60205802e1b5c6ec1cafa3cacd49dfeece05ac9";
let coneGauge = "0xA766094e9bf0AFc1BB5208EC9a81a782663d797a";
let veCone = '0xd0C1378c177E961D96c06b0E8F6E7841476C81Ef';

let unkwnToken = '0xD7FbBf5CB43b4A902A8c994D94e821f3149441c7';
let unkwnUserProxy = '0xAED5a268dEE37677584af58CCC2b9e3c83Ab7dd8';
let unkwnLens = '0x5b1cEB9adcec674552CB26dD55a5E5846712394C';

let pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

let wbnbBusdSlippagePercent = 100; //1%
let liquidationThreshold = 800;
let healthFactor = 1350


function strategyTest(strategyParams, network, assetAddress, runStrategyLogic) {

    let values = [
        {
            value: 2,
            deltaPercent: 5,
        },
        {
            value: 20,
            deltaPercent: 1,
        },
        {
            value: 200,
            deltaPercent: 1,
        },
        {
            value: 2000,
            deltaPercent: 1,
        },
        {
            value: 20000,
            deltaPercent: 1,
        },
        {
            value: 200000,
            deltaPercent: 0.1,
        },
    ]

    describe(`${strategyParams.name}`, function () {
        stakeUnstake(strategyParams, network, assetAddress, values, runStrategyLogic);
        // claimRewards(strategyParams, network, assetAddress, values, runStrategyLogic);
    });
}

function stakeUnstake(strategyParams, network, assetAddress, values, runStrategyLogic) {

    describe(`Stake/unstake`, function () {

        let account;
        let recipient;

        let strategy;
        let strategyName;

        let asset;
        let toAsset = function () {
        };

        let expectedHealthFactor = '1350000000000000000';
        let healthFactorDELTA = '10000000000000000';

        sharedBeforeEach("deploy", async () => {
            await hre.run("compile");
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = provider.createEmptyWallet();

            await transferETH(10, recipient.address);
            await transferETH(10, account.address);
            await transferETH(10, (await initWallet()).address);
            await transferUSDPlus(1000, account.address);
            strategyName = strategyParams.name;

            await deployments.fixture([strategyName, 'ControlBusdWbnb', `${strategyName}Setting`]);
            
            strategy = await ethers.getContract(strategyName);
            let control = await ethers.getContract('ControlBusdWbnb');
            await strategy.setExchanger(recipient.address);

            const exchange = await getContract('Exchange', 'bsc');
            const usdPlus = await getContract('UsdPlusToken', 'bsc');

            let setupParams = {
                usdPlus: usdPlus.address,
                busd: busd,
                wbnb: wbnb,
                vBusdToken: vBusdToken,
                vBnbToken: vBnbToken,
                xvsToken: xvsToken,
                unitroller: unitroller,
                maximillion: maximillion,
                oracleBusd: oracleBusd,
                oracleWbnb: oracleWbnb,
                coneRouter: coneRouter,
                conePair: conePair,
                coneVoter: coneVoter,
                coneGauge: coneGauge,
                coneToken: coneToken,
                veCone: veCone,
                veConeId: 0,
                exchange: exchange.address,
                tokenAssetSlippagePercent: wbnbBusdSlippagePercent,
                liquidationThreshold: liquidationThreshold,
                healthFactor: healthFactor,
                unkwnToken: unkwnToken,
                unkwnUserProxy: unkwnUserProxy,
                unkwnLens: unkwnLens,
                control: control.address,
                pancakeRouter: pancakeRouter,
            }

            await (await strategy.setParams(setupParams)).wait();

            await execTimelock(async (timelock) => {
                let exchange = await getContract('Exchange');
                console.log(`exchange: ${exchange.address}`);
                await exchange.connect(timelock).grantRole(await exchange.FREE_RIDER_ROLE(), strategy.address);
                console.log(`FREE_RIDER_ROLE granted to ${strategy.address}`);
            });

            asset = await getERC20("usdPlus");
            let decimals = await asset.decimals();
            if (decimals === 18) {
                toAsset = toE18;
            } else {
                toAsset = toE6;
            }

        });

        values.forEach(item => {

            let stakeValue = item.value;
            let deltaPercent = item.deltaPercent ? item.deltaPercent : 5;
            let unstakeValue = stakeValue / 2;

            describe(`Stake ${stakeValue}`, function () {

                let balanceAsset;
                let expectedNetAsset;

                let VALUE;
                let DELTA;

                let netAssetValueCheck;
                let healthFactor;

                sharedBeforeEach(`Stake ${stakeValue}`, async () => {

                    try {
                        // let balances = await strategy.balances();
                        // console.log(`balances before:\n${JSON.stringify(balances, null, 2)}`)

                        await m2m(strategy);

                        let assetValue = toAsset(stakeValue);
                        VALUE = new BigNumber(assetValue);
                        DELTA = VALUE.multipliedBy(new BigNumber(deltaPercent)).div(100);

                        await asset.connect(account).transfer(recipient.address, assetValue);

                        let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        expectedNetAsset = (new BigNumber((await strategy.netAssetValue()).toString())).plus(VALUE);
                        console.log(`expectedNetAsset: ${expectedNetAsset}`)
                        
                        await asset.connect(recipient).transfer(strategy.address, assetValue); 
                        await strategy.connect(recipient).stake(assetValue);
                        let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        balanceAsset = balanceAssetBefore.minus(balanceAssetAfter);
                        netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                        console.log(`----------------------`)
                        console.log(`balanceAssetAfter: ${balanceAssetAfter}`)
                        console.log(`balanceAsset: ${balanceAsset}`)
                        console.log(`netAssetValueCheck: ${netAssetValueCheck}`)
                        console.log(`----------------------`)
                        healthFactor = await strategy.currentHealthFactor();

                        // balances = await strategy.balances();
                        // console.log(`balances after:\n${JSON.stringify(balances, null, 2)}`)
                        await m2m(strategy);
                    } catch (e) {
                        console.log(e)
                        throw e;
                    }

                });

                it(`Balance asset is in range`, async function () {
                    greatLess(balanceAsset, VALUE, DELTA);
                });

                it(`NetAssetValue asset is in range`, async function () {
                    greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                });

                it(`Health Factor is in range`, async function () {
                    greatLess(healthFactor, expectedHealthFactor, healthFactorDELTA);
                });

                describe(`UnStake ${unstakeValue}`, function () {

                    let balanceAsset;
                    let expectedNetAsset;
                    let expectedLiquidation;

                    let VALUE;
                    let DELTA;

                    let netAssetValueCheck;
                    let healthFactor;

                    sharedBeforeEach(`Unstake ${unstakeValue}`, async () => {

                        await m2m(strategy);
                        let assetValue = toAsset(unstakeValue);
                        VALUE = new BigNumber(assetValue);
                        DELTA = VALUE.times(new BigNumber(deltaPercent)).div(100);

                        let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        expectedNetAsset = new BigNumber((await strategy.netAssetValue()).toString()).minus(VALUE);
                        // expectedLiquidation = new BigNumber((await strategy.liquidationValue()).toString()).minus(VALUE);

                        await strategy.connect(recipient).unstake(assetValue, recipient.address);

                        let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        balanceAsset = balanceAssetAfter.minus(balanceAssetBefore);

                        netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                        healthFactor = await strategy.currentHealthFactor();

                        await m2m(strategy);

                    });

                    it(`Balance asset is in range`, async function () {
                        greatLess(balanceAsset, VALUE, DELTA);
                    });

                    it(`NetAssetValue asset is in range`, async function () {
                        greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                    });

                    it(`Health Factor is in range`, async function () {
                        greatLess(healthFactor, expectedHealthFactor, healthFactorDELTA);
                    });

                });

            });

        });

    });
}


function claimRewards(strategyParams, network, assetAddress, values, runStrategyLogic) {

    describe(`Stake/ClaimRewards`, function () {

        let account;
        let recipient;

        let strategy;
        let strategyName;

        let asset;
        let toAsset = function () {
        };

        let expectedHealthFactor = '1350000000000000000';
        let healthFactorDELTA = '10000000000000000';

        sharedBeforeEach("deploy", async () => {
            await hre.run("compile");
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = provider.createEmptyWallet();

            await transferETH(10, recipient.address);
            await transferETH(10, account.address);
            await transferETH(10, (await initWallet()).address);
            await transferUSDPlus(1000, account.address);
            strategyName = strategyParams.name;

            await deployments.fixture([strategyName, 'ControlBusdWbnb', `${strategyName}Setting`]);
            
            strategy = await ethers.getContract(strategyName);
            let control = await ethers.getContract('ControlBusdWbnb');
            await strategy.setExchanger(recipient.address);

            const exchange = await getContract('Exchange', 'bsc');
            const usdPlus = await getContract('UsdPlusToken', 'bsc');

            let setupParams = {
                usdPlus: usdPlus.address,
                busd: busd,
                wbnb: wbnb,
                vBusdToken: vBusdToken,
                vBnbToken: vBnbToken,
                xvsToken: xvsToken,
                unitroller: unitroller,
                maximillion: maximillion,
                oracleBusd: oracleBusd,
                oracleWbnb: oracleWbnb,
                coneRouter: coneRouter,
                conePair: conePair,
                coneVoter: coneVoter,
                coneGauge: coneGauge,
                coneToken: coneToken,
                veCone: veCone,
                veConeId: 0,
                exchange: exchange.address,
                tokenAssetSlippagePercent: wbnbBusdSlippagePercent,
                liquidationThreshold: liquidationThreshold,
                healthFactor: healthFactor,
                unkwnToken: unkwnToken,
                unkwnUserProxy: unkwnUserProxy,
                unkwnLens: unkwnLens,
                control: control.address,
                pancakeRouter: pancakeRouter,
            }

            await (await strategy.setParams(setupParams)).wait();

            await execTimelock(async (timelock) => {
                let exchange = await getContract('Exchange');
                console.log(`exchange: ${exchange.address}`);
                await exchange.connect(timelock).grantRole(await exchange.FREE_RIDER_ROLE(), strategy.address);
                console.log(`FREE_RIDER_ROLE granted to ${strategy.address}`);
            });

            asset = await getERC20("usdPlus");
            let decimals = await asset.decimals();
            if (decimals === 18) {
                toAsset = toE18;
            } else {
                toAsset = toE6;
            }

        });

        values.forEach(item => {

            let stakeValue = item.value;
            let deltaPercent = item.deltaPercent ? item.deltaPercent : 5;
            let unstakeValue = stakeValue / 2;

            describe(`Stake ${stakeValue}`, function () {

                let balanceAsset;
                let expectedNetAsset;

                let VALUE;
                let DELTA;

                let netAssetValueCheck;
                let healthFactor;

                sharedBeforeEach(`Stake ${stakeValue}`, async () => {

                    try {
                        // let balances = await strategy.balances();
                        // console.log(`balances before:\n${JSON.stringify(balances, null, 2)}`)

                        await m2m(strategy);

                        let assetValue = toAsset(stakeValue);
                        VALUE = new BigNumber(assetValue);
                        DELTA = VALUE.multipliedBy(new BigNumber(deltaPercent)).div(100);

                        await asset.connect(account).transfer(recipient.address, assetValue);

                        let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        expectedNetAsset = (new BigNumber((await strategy.netAssetValue()).toString())).plus(VALUE);
                        console.log(`expectedNetAsset: ${expectedNetAsset}`)
                        
                        await asset.connect(recipient).transfer(strategy.address, assetValue);
                        await strategy.connect(recipient).stake(assetValue);
                        let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        balanceAsset = balanceAssetBefore.minus(balanceAssetAfter);
                        netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                        console.log(`----------------------`)
                        console.log(`balanceAssetAfter: ${balanceAssetAfter}`)
                        console.log(`balanceAsset: ${balanceAsset}`)
                        console.log(`netAssetValueCheck: ${netAssetValueCheck}`)
                        console.log(`----------------------`)
                        healthFactor = await strategy.currentHealthFactor();

                        await m2m(strategy);

                        const sevenDays = 7 * 24 * 60 * 60 * 1000;
                        await ethers.provider.send("evm_increaseTime", [sevenDays])
                        await ethers.provider.send('evm_mine');

                        await strategy.connect(recipient).claimRewards(recipient.address);
    
                        balanceAsset = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        await m2m(strategy);
                    } catch (e) {
                        console.log(e)
                        throw e;
                    }

                });

                it(`Balance asset is not 0`, async function () {
                    expect(balanceAsset.toNumber()).to.greaterThan(0);
                });

            });

        });

    });
}



function fromE6(value){
    return  value / 10 ** 6;
}

async function m2m(strategy) {
    console.log('ETS:')

    let values = [];
    values.push({name: 'Total NAV', value: fromE6((await strategy.netAssetValue()).toString())});
    values.push({name: 'HF', value: (await strategy.currentHealthFactor()).toString()});

    console.table(values);


    let items = await strategy.balances();

    let arrays = [];
    for (let i = 0; i < items.length; i++) {

        let item = items[i];

        arrays.push({
            name: item[0],
            amountUSD: fromE6(item[1].toString()),
            //amount: fromE18(item[2].toString()),
            borrowed: item[3].toString()
        })

    }

    console.table(arrays);
}

function greatLess(value, expected, delta) {

    value = new BigNumber(value.toString());
    expected = new BigNumber(expected.toString());
    let maxValue = expected.plus(delta);
    let minValue = expected.minus(delta);

    let lte = value.lte(maxValue);
    let gte = value.gte(minValue);

    let valueNumber = value.div(new BigNumber(10).pow(6)).toFixed();
    let minValueNumber = minValue.div(new BigNumber(10).pow((6)).toFixed());
    let maxValueNumber = maxValue.div(new BigNumber(10).pow(6)).toFixed();

    let minSub = (value.minus(minValue)).div(new BigNumber(10).pow(6)).toFixed();
    let maxSub = (value.minus(maxValue)).div(new BigNumber(10).pow(6)).toFixed();

    expect(gte).to.equal(true, `Value[${valueNumber}] less than Min Value[${minValueNumber}] dif:[${minSub}]`);
    expect(lte).to.equal(true, `Value[${valueNumber}] great than Max Value[${maxValueNumber}] dif:[${maxSub}]`);
}

module.exports = {
    strategyTest: strategyTest,
}
