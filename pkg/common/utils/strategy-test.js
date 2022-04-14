const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const {resetHardhat, greatLess} = require("./tests");
const ERC20 = require("./abi/IERC20.json");
const {logStrategyGasUsage} = require("./strategyCommon");
const {toUSDC, fromUSDC} = require("./decimals");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {expect} = require("chai");

function strategyTest(strategyName, network, assets) {


    describe(`${strategyName}`, function () {


        describe(`Stake/unstake`, function () {

            let account;
            let strategy;
            let usdc;

            before(async () => {
                await hre.run("compile");
                await resetHardhat(network);

                await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

                const {deployer} = await getNamedAccounts();
                account = deployer;

                strategy = await ethers.getContract(strategyName);
                await strategy.setPortfolioManager(account);

                usdc = await ethers.getContractAt(ERC20, assets.usdc);
            });

            it("log gas", async () => {
                await logStrategyGasUsage(strategyName, strategy, usdc, account)
            });

            describe("Stake 50+50 USDC", function () {

                let balanceUsdc;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);

                    await usdc.transfer(strategy.address, toUSDC(50));
                    await strategy.stake(usdc.address, toUSDC(50));

                    await usdc.transfer(strategy.address, toUSDC(50));
                    await strategy.stake(usdc.address, toUSDC(50));

                    let balanceUsdcAfter = await usdc.balanceOf(account);

                    balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);

                });

                it("Balance USDC should be greater than 99 less than 101", async function () {
                    greatLess(balanceUsdc, 100, 1);
                });


                it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
                    greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
                });

                it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
                    greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
                });

                describe("Unstake 25+25 USDC", function () {

                    let balanceUsdc;

                    before(async () => {

                        let balanceUsdcBefore = await usdc.balanceOf(account);

                        await strategy.unstake(usdc.address, toUSDC(25), account, false);
                        await strategy.unstake(usdc.address, toUSDC(25), account, false);

                        let balanceUsdcAfter = await usdc.balanceOf(account);

                        balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);

                    });

                    it("Balance USDC should be greater than 49 less than 51", async function () {
                        greatLess(balanceUsdc, 50, 1);
                    });


                    it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                        greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
                    });

                    it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                        greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
                    });

                    describe("Unstake Full", function () {

                        let balanceUsdc;

                        before(async () => {

                            let balanceUsdcBefore = await usdc.balanceOf(account);

                            await strategy.unstake(usdc.address, 0, account, true);

                            let balanceUsdcAfter = await usdc.balanceOf(account);

                            balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);

                        });

                        it("Balance USDC should be greater than 49 less than 51", async function () {
                            greatLess(balanceUsdc, 50, 1);
                        });


                        it("NetAssetValue USDC should be greater than 0 less than 1", async function () {
                            greatLess(fromUSDC(await strategy.netAssetValue()), 0.5, 0.5);
                        });

                        it("LiquidationValue USDC should be greater than 0 less than 1", async function () {
                            greatLess(fromUSDC(await strategy.liquidationValue()), 0.5, 0.5);
                        });

                    });

                });

            });

        });


        describe(`ClaimRewards`, function () {

            let account;
            let strategy;
            let usdc;

            before(async () => {
                await resetHardhat(network);

                await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

                const {deployer} = await getNamedAccounts();
                account = deployer;

                strategy = await ethers.getContract(strategyName);
                await strategy.setPortfolioManager(account);

                usdc = await ethers.getContractAt(ERC20, assets.usdc);
            });

            describe("Stake 100 USDC. Claim rewards", function () {

                let balanceUsdc;

                before(async () => {

                    await usdc.transfer(strategy.address, toUSDC(100));
                    await strategy.stake(usdc.address, toUSDC(100));

                    // timeout 7 days
                    const sevenDays = 7 * 24 * 60 * 60;
                    await ethers.provider.send("evm_increaseTime", [sevenDays])
                    await ethers.provider.send('evm_mine');

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    await strategy.claimRewards(account);
                    let balanceUsdcAfter = await usdc.balanceOf(account);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    console.log("Rewards: " + balanceUsdc);
                });

                it("Rewards should be greater 0 USDC", async function () {
                    expect(balanceUsdc).to.greaterThan(0);
                });

            });

        });
    });


}


module.exports = {
    strategyTest: strategyTest,
}
