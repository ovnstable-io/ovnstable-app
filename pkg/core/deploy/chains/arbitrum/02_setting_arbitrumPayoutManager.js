const { ethers } = require('hardhat');
const { getContract, getPrice } = require('@overnight-contracts/common/utils/script-utils');
const {
    createSkim,
    createSkimTo,
    createSkimToWithFee,
    createBribe,
    createBribeWithFee,
    createSync,
    createCustomBribe,
    createCustom,
} = require('@overnight-contracts/common/utils/payoutListener');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const { COMMON } = require('@overnight-contracts/common/utils/assets');

module.exports = async () => {
    const payoutManager = await getContract('ArbitrumPayoutManager', 'arbitrum');
    const usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    const usdtPlus = await getContract('UsdPlusToken', 'arbitrum_usdt');
    const ethPlus = await getContract('UsdPlusToken', 'arbitrum_eth');
    const daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');

    let items = [];

    items.push(...wombat());
    items.push(...chronos());
    items.push(...curve());
    items.push(...pancakeswap());
    items.push(...traderjoe());
    items.push(...uniswap());
    await (await payoutManager.addItems(items)).wait();

    console.log('ArbitrumPayoutManager setting done');

    function pancakeswap() {
        let dex = 'PancakeSwap';

        let items = [];
        items.push(createSkim('0xdAA80a051E22A7f7b0cfC33Aa29572fbDE65183E', ethPlus.address, 'WETH/ETH+', dex));
        items.push(createSkim('0xb9c2d906f94b27bC403Ab76B611D2C4490c2ae3F', usdPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0xb9c2d906f94b27bC403Ab76B611D2C4490c2ae3F', usdtPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0x06c75011479E47280e8B7E72E9e0315C8b3A634d', ethPlus.address, 'USD+/ETH+', dex));
        items.push(createSkim('0x06c75011479E47280e8B7E72E9e0315C8b3A634d', usdPlus.address, 'USD+/ETH+', dex));
        items.push(createSkim('0xd01075f7314a6436e8B74fc18069848229D0c555', usdPlus.address, 'USD+/USDC', dex));
        items.push(createSkim('0x714d48cb99b87f274b33a89fbb16ead191b40b6c', usdPlus.address, 'OVN/USD+', dex));
        items.push(createSkim('0x721F37495cD70383B0A77Bf1eB8f97eef29498Bb', usdPlus.address, 'USD+/USDC', dex));
        items.push(createSkim('0x8a06339Abd7499Af755DF585738ebf43D5D62B94', usdPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0x8a06339Abd7499Af755DF585738ebf43D5D62B94', usdtPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0x35D85D531BE7159cB6f92E8B9CeaF04eC28c6ad9', usdPlus.address, 'USD+/USDV', dex));
        items.push(createSkim('0xf92768916015b5eBd9fa54D6BA10dA5864e24914', usdPlus.address, 'USD+/ARB', dex));
        items.push(createSkim('0xa1F9159e11aD48524c16C9bf10bf440815b03e6C', usdPlus.address, 'USD+/USDC', dex));
        items.push(createSkim('0xe37304F7489ed253b2A46A1d9DabDcA3d311D22E', usdPlus.address, 'USD+/WETH', dex));
        items.push(createSkim('0xfE193D41Bf8EE691beC999bcE0981B6D06c89394', usdPlus.address, 'USD+/USDT', dex));

        return items;
    }

    function curve() {
        let dex = 'Curve';

        let items = [];
        items.push(createSkim('0xb34a7d1444a707349Bc7b981B7F2E1f20F81F013', usdPlus.address, 'USD+/FRAX', dex));
        items.push(createSkim('0x1446999B0b0E4f7aDA6Ee73f2Ae12a2cfdc5D9E7', usdPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0x1446999B0b0E4f7aDA6Ee73f2Ae12a2cfdc5D9E7', usdtPlus.address, 'USD+/USDT+', dex));
        return items;
    }

    function wombat() {
        let dex = 'Wombat';

        let items = [];
        items.push(createSkim('0xBd7568d25338940ba212e3F299D2cCC138fA35F0', usdPlus.address, 'LP-USD+', dex));

        return items;
    }

    function chronos() {
        let dex = 'Chronos';

        let items = [];
        items.push(createSkim('0x0D20EF7033b73Ea0c9c320304B05da82E2C14E33', usdPlus.address, 'FRAX/USD+', dex));

        return items;
    }

    function traderjoe() {
        let dex = 'TraderJoe';

        let items = [];
        items.push(createSkim('0xa8A502ACF4084B8D38362E9F620C689CB4D2EB89', usdPlus.address, 'USD+/ETH', dex));
        items.push(createSkim('0x37570DB173beF23F6924beaE3CD960b41AB6AD74', usdPlus.address, 'USD+/USDT', dex));

        return items;
    }

    function uniswap() {
        let dex = 'Uniswap';

        let items = [];
        items.push(createSkim('0x3dD2FdBA71282083D440687cce9e4231AAAc534E', usdPlus.address, 'ETH/USD+', dex));
        items.push(createSkim('0x7548BD60CB8f627A9b8ed94f8ca174348DbE6A05', usdPlus.address, 'USDC/USD+', dex));
        items.push(createSkim('0x67ab7DC903A10838a0de8861dfDFF3287cF98e5c', usdPlus.address, 'USDT/USD+', dex));
        items.push(createSkim('0x421803dA50d3932Caa36bD1731d36a0E2AF93542', usdPlus.address, 'ETH/USD+', dex));

        return items;
    }
};

module.exports.tags = ['SettingArbitrumPayoutManager'];
