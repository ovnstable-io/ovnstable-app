const {
    getContract,
    transferAsset,
    initWallet,
    getCoreAsset,
    impersonateAccount,
    getERC20ByAddress,
    transferETH
} = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { toAsset } = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");

async function main() {
    let amount = 10000;
    let iterations = 10;

    // const signers = await ethers.getSigners();
    let wallet = await initWallet();
    // const wallet = signers[0];
    

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x086dFe298907DFf27BD593BD85208D57e0155c94"],
    });

    const dev5 = await hre.ethers.getSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");

    let pm = await getContract('PortfolioManager', 'base_usdc');
    let aeroSwap = await getContract('AeroSwap', 'base');
    let exchange = await getContract('Exchange', 'base_usdc');
    let usdcPlus = await getContract('UsdPlusToken', 'base_usdc');
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    let poolAddress = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147";
    let pool = await hre.ethers.getContractAt("ICLPool", "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147");
    let devAddress = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
    
    await transferETH(10, wallet.address);
    await transferETH(10, devAddress);

    await aeroSwap.setSimulationParams(BASE.aerodromeFactory);
    

    // const dev5 = await impersonateAccount(devAddress);


    let balInit = await usdc.balanceOf(wallet.address);

    await transferAsset(BASE.usdc, wallet.address, toAsset(amount * 10));

    let balAfterTransfer = await usdc.balanceOf(wallet.address);


    console.log("balInit " + balInit.toString());
    console.log("balAfterTransfer " + balAfterTransfer.toString());

    let slot0 = await pool.slot0();
    console.log("cur price: ", slot0[0].toString());

    for (let i = 0; i < iterations; i++) {
        let plusBalance1 = await usdcPlus.balanceOf(wallet.address);
        console.log("usdc+ bal before: ", plusBalance1.toString());

        await (await usdc.connect(wallet).approve(exchange.address, toAsset(amount))).wait();
        console.log("approve usdc", toAsset(amount));

        await (await exchange.connect(wallet).mint({
            asset: usdc.address,
            amount: toAsset(amount),
            referral: ''
        })).wait();
        

        let plusBalance2 = await usdcPlus.balanceOf(wallet.address);
        

        let usdcplusAmount = (plusBalance2 - plusBalance1).toString();

        console.log("usdcplusAmount " + usdcplusAmount.toString());

        await (await usdcPlus.approve(aeroSwap.address, usdcplusAmount)).wait();
        
        slot0 = await pool.slot0();
        console.log("price before swap: ", slot0[0].toString());
        await (await aeroSwap.swap(poolAddress, usdcplusAmount, 0n, false)).wait();
        slot0 = await pool.slot0();
        console.log("price after swap: ", slot0[0].toString());

        await (await pm.connect(dev5).balance()).wait();
        slot0 = await pool.slot0();
        console.log("price after rebalance: ", slot0[0].toString());
    }

    let balFinish = await usdc.balanceOf(wallet.address);
    console.log("balFinish " + balFinish.toString());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

