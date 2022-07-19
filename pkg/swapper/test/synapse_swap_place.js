const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;

const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");


describe("SynapseSwapPlace", function () {

    let synapseSwapPlaceType = "SynapseSwapPlace";
    let synapseSwapPlace;

    let synapsePool = '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5';

    let account;
    let secondAccount;
    let swapper;
    let mockSwapPlace;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["Swapper", "MockSwapPlace"]);

        const {deployer, anotherAccount} = await getNamedAccounts();
        account = deployer;
        secondAccount = anotherAccount;
        swapper = await ethers.getContract("Swapper");
        mockSwapPlace = await ethers.getContract("MockSwapPlace");


        await deployments.fixture(["SynapseSwapPlace", "BuyonSwap"]);
        synapseSwapPlace = await ethers.getContract("SynapseSwapPlace");

        await swapper.swapPlaceRegister(
            synapseSwapPlaceType,
            synapseSwapPlace.address,
        );
        await swapper.swapPlaceInfoRegister(
            POLYGON.usdc,
            POLYGON.usdt,
            synapsePool,
            synapseSwapPlaceType,
        );


        let value = "10000000000000000000000000"; // 10kk matics

        const buyonSwap = await ethers.getContract("BuyonSwap");

        let tx = await (await buyonSwap.buy(POLYGON.usdc, POLYGON.quickSwapRouter, {value: value})).wait();
        let swapInfo = tx.events.find((e) => e.event === 'SwapInfo');

        console.log('Buy usdc: ' + swapInfo.args.amountOut);

    });

    it("checkPath 10", async function () {

        let params = {
            tokenIn: POLYGON.usdc,
            tokenOut: POLYGON.usdt,
            amountIn: "1000000000000",
            amountOutMin: 0,
            partsAmount: 10,
        };

        let path = await swapper.swapPath(params);

        // console.log(JSON.stringify(path, null, 2))

        let totalAmountIn = 0;
        let totalAmountOut = 0;
        for (let i = 0; i < path.length; i++) {
            let swapRoute = path[i];
            totalAmountIn += parseInt(swapRoute.amountIn.toString());
            totalAmountOut += parseInt(swapRoute.amountOut.toString());
            console.log(`${swapRoute.amountIn} -> ${swapRoute.amountOut} on ${swapRoute.pool}`)
        }
        console.log(`Total: ${totalAmountIn} -> ${totalAmountOut}`)

    });

    it("swap 10", async function () {

        let params = {
            tokenIn: POLYGON.usdc,
            tokenOut: POLYGON.usdt,
            amountIn: "1000000000000",
            amountOutMin: 0,
            partsAmount: 10,
        };

        let tokenIn = await ethers.getContractAt("IERC20", params.tokenIn);
        let tokenOut = await ethers.getContractAt("IERC20", params.tokenOut);

        let tokenInBalanceBefore = new BN((await tokenIn.balanceOf(account)).toString());
        let tokenOutBalanceBefore = new BN((await tokenOut.balanceOf(account)).toString());

        console.log(`tokenInBalanceBefore: ${tokenInBalanceBefore}`)
        console.log(`tokenOutBalanceBefore: ${tokenOutBalanceBefore}`)

        let path = await swapper.swapPath(params);
        let totalAmountIn = new BN(0);
        let totalAmountOut = new BN(0);
        for (let i = 0; i < path.length; i++) {
            let swapRoute = path[i];
            totalAmountIn = totalAmountIn.add(new BN(swapRoute.amountIn.toString()));
            totalAmountOut = totalAmountOut.add(new BN(swapRoute.amountOut.toString()));
        }

        await (await tokenIn.approve(swapper.address, params.amountIn));
        await (await swapper.swap(params)).wait();

        let tokenInBalanceAfter = new BN((await tokenIn.balanceOf(account)).toString());
        let tokenOutBalanceAfter = new BN((await tokenOut.balanceOf(account)).toString());

        let tokenInBalanceDelta = tokenInBalanceAfter.sub(tokenInBalanceBefore);
        let tokenOutBalanceDelta = tokenOutBalanceAfter.sub(tokenOutBalanceBefore);

        console.log(`tokenInBalanceAfter: ${tokenInBalanceAfter}`)
        console.log(`tokenOutBalanceAfter: ${tokenOutBalanceAfter}`)

        console.log(`tokenInBalanceDelta: ${tokenInBalanceDelta}`)
        console.log(`tokenOutBalanceDelta: ${tokenOutBalanceDelta}`)

        expect(totalAmountIn.eq(tokenInBalanceDelta.neg()));
        expect(totalAmountOut.eq(tokenOutBalanceDelta));
    });

    // // uncomment to see gas usage. Previous:
    // // 2:  165395 -> 473403 => 308008
    // // 5:  280963 -> 588673 => 307710
    // // 10: 472518 -> 780761 => 308243
    // //
    // it("check path and swap estimate gas", async function () {
    //
    //     let params = {
    //         tokenIn: POLYGON.usdc,
    //         tokenOut: POLYGON.usdt,
    //         amountIn: "1000000000000",
    //         amountOutMin: 0,
    //         partsAmount: 1,
    //     };
    //     let tokenIn = await ethers.getContractAt("IERC20", params.tokenIn);
    //     await (await tokenIn.approve(swapper.address, params.amountIn));
    //
    //     for (let i = 1; i <= 100; i++) {
    //         params.partsAmount = i;
    //         let estGasForPath = parseInt((await swapper.estimateGas.swapPath(params)).toString());
    //         let estGasForSwap = parseInt((await swapper.estimateGas.swap(params)).toString());
    //         console.log(`${i}: ${estGasForPath} -> ${estGasForSwap} => ${estGasForSwap - estGasForPath}`)
    //     }
    //
    // });

});




