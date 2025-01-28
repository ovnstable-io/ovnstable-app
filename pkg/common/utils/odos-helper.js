const axios = require("axios");
const BigNumber = require('bignumber.js');
const {ethers} = require("hardhat");
const {getChainId} = require("./script-utils");

async function getOdosSwapData(tokenIn, tokenOut, amountTokenIn) {

    let insurance = await ethers.getContract("InsuranceExchange");

    const inputToken = { "tokenAddress": tokenIn, "amount": amountTokenIn.toString() };
    const outputToken = { "tokenAddress": tokenOut, "proportion": 1 };

    let params = {
        "inputTokens": inputToken,
        "outputTokens": outputToken,
        "userAddr": insurance.address,
        "blackList": ["Overnight Exchange", "Hashflow"] // for Insurance
    }

    const request = await getOdosRequest(params);

    return {
            inputTokenAddress: tokenIn,
            outputTokenAddress: tokenOut,
            amountIn: amountTokenIn.toString(),
            data: request.transaction.data
        }
}

async function getOdosAmountOut(tokenIn, tokenOut, amountTokenIn) {

    let insurance = await ethers.getContract("InsuranceExchange");

    const inputToken = { "tokenAddress": tokenIn, "amount": amountTokenIn.toString() };
    const outputToken = { "tokenAddress": tokenOut, "proportion": 1 };

    const request = await getOdosRequest({
        "inputTokens": inputToken,
        "outputTokens": outputToken,
        "userAddr": insurance.address,
    });

    return request.outputTokens[0].amount;
}

async function getOdosRequest(request) {
    let defaultBlackList = ["Hashflow"];

    if (request.blackList){
        defaultBlackList.push(...request.blackList);
    }

    let swapParams = {
        "chainId": await getChainId(),
        "gasPrice": 20,
        "inputTokens": [request.inputTokens],
        "outputTokens": [request.outputTokens],
        "userAddr": request.userAddr,
        "slippageLimitPercent": 1,
        "sourceBlacklist": defaultBlackList,
        "sourceWhitelist": [],
        "simulate": false,
        "pathViz": false,
        "disableRFQs": false
    }

    console.log("swapParams", swapParams);

    // @ts-ignore
    const urlQuote = 'https://backend.overnight.fi/odos/sor/quote/v2';
    const urlAssemble = 'https://backend.overnight.fi/odos/sor/assemble';
    // const urlQuote = 'https://api.odos.xyz/sor/quote/v2';
    // const urlAssemble = 'https://api.odos.xyz/sor/assemble';
    let transaction;
    try {
        let quotaResponse = (await axios.post(urlQuote, swapParams, { headers: { "Accept-Encoding": "br" } }));

        let assembleData = {
            "userAddr": request.userAddr,
            "pathId": quotaResponse.data.pathId,
            "simulate": false
        }

        // console.log("assembleData: ", assembleData)
        transaction = (await axios.post(urlAssemble, assembleData, { headers: { "Accept-Encoding": "br" } }));
        // console.log("odos transaction simulation: ", transaction.data.simulation)
    } catch (e) {
        console.log("[zap] getSwapTransaction: ", e);
        return 0;
    }

    if (transaction.statusCode === 400) {
        console.log(`[zap] ${transaction.description}`);
        return 0;
    }

    if (transaction.data.transaction === undefined) {
        console.log("[zap] transaction.tx is undefined");
        return 0;
    }

    console.log('Success get data from Odos!');
    return transaction.data;
}


function getEmptyOdosData(){

    let zeroAddress = "0x0000000000000000000000000000000000000000";
    let odosEmptyData = {
        inputTokenAddress: zeroAddress,
        outputTokenAddress: zeroAddress,
        amountIn: 0,
        data: ethers.utils.formatBytes32String("")
    }

    return odosEmptyData;
}

module.exports = {
    getOdosSwapData: getOdosSwapData,
    getEmptyOdosData: getEmptyOdosData,
    getOdosAmountOut: getOdosAmountOut,
    getOdosRequest: getOdosRequest
}
