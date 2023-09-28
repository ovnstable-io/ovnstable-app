const {ethers} = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await getContract("BasePayoutListener", 'base');
    const usdPlus = await getContract('UsdPlusToken', 'base');
    const daiPlus = await getContract('UsdPlusToken', 'base_dai');

    let items = [];
//    items.push(...baseSwap());
//    items.push(...velocimeter());
//    items.push(...swapBased());
//    items.push(...alienBase());
//    items.push(...zyberSwap());
//    items.push(...aerodrome());
    items.push(...moonbase());

    let price = await getPrice();

//    await (await pl.removeItem(usdPlus.address, '0x42731e7774cf1b389fe2d9552bbdd6e4bb05e42b', price)).wait();
//    await (await pl.removeItems(price)).wait();
    await (await pl.addItems(items, price)).wait();

    console.log('BasePayoutListener setting done');

    function zyberSwap(){

        let dex = 'ZyberSwap';
        let to = '0x55e6a720FF12ee43ADc6F5BdEA8580ec07b21C47';

        let items = [];
        items.push(createSkimToWithFee('0xb71dEc1ae87A174429a367318082C13b7512a947', usdPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xb71dEc1ae87A174429a367318082C13b7512a947', daiPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function baseSwap() {

        let dex = 'BaseSwap';
        let to = '0xaf1823bacd8edda3b815180a61f8741fa4abc6dd';

        let items = [];
        items.push(createSkimToWithFee('0x7Fb35b3967798cE8322cC50eF52553BC5Ee4c306', usdPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x7Fb35b3967798cE8322cC50eF52553BC5Ee4c306', daiPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x696b4d181Eb58cD4B54a59d2Ce834184Cf7Ac31A', usdPlus.address, 'USD+/USDbC', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function velocimeter() {

        let dex = 'Velocimeter';

        let items = [];
        items.push(createBribeWithFee('0x298c9f812c470598c5f97e3da9261a9899b89d35', usdPlus.address, 'DAI+/USD+', dex, '0x508dE140Aa70d696E5feb6B718f44b2538500ab5', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x298c9f812c470598c5f97e3da9261a9899b89d35', daiPlus.address, 'DAI+/USD+', dex, '0x508dE140Aa70d696E5feb6B718f44b2538500ab5', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x653685aa9913c6ab13d659a4ea8f358ecec3d34f', usdPlus.address, 'USD+/USDbC', dex, '0x3be8Bc75E0902f4F51316eE8F142Bc1F0C57948e', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x42731e7774cf1b389fe2d9552bbdd6e4bb05e42b', daiPlus.address, 'DAI+/USDbC', dex, '0x18DBECb056aCFb8C731483207FC4029ca09D6aE1', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x4a9683ab8f705ef3cf61c6466e77471aef41abd5', usdPlus.address, 'ERN/USD+', dex, '0xc8334Db5dB446FCcF47E48E30A5E0b95576Bea09', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0xe31e3a567bf57dcd773586392c358bf73e2133c3', usdPlus.address, 'gCEAZOR/USD+', dex, '0xA1e87EaEc809c8A70F725b26e1Da209018240a37', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0xeEabF63f536979A0073f27E1CB44711A21Ae21Be', usdPlus.address, 'gLEVI/USD+', dex, '0x1EB5f2fd6de9E4BA24E6cb3E8e4a1A44006a63bc', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x433B5fB936fe8FA77fa94f2a1C5f70dD3237b1D3', usdPlus.address, 'WETH/USD+', dex, '0x7eB01BD690fCC6CB45597f2BEf85BF132f59ECd2', 20, COMMON.rewardWallet));

        return items;
    }

    function swapBased() {

        let dex = 'SwapBased';
        let to = '0x1d868A13E1938fF16deb69A4ee49e8891d6a0A16';

        let items = [];
        items.push(createSkimToWithFee('0x164Bc404c64FA426882D98dBcE9B10d5df656EeD', usdPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x164Bc404c64FA426882D98dBcE9B10d5df656EeD', daiPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x282f9231E5294E7354744df36461c21e0E68061C', usdPlus.address, 'USD+/USDbC', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function alienBase() {

        let dex = 'AlienBase';
        let to = '0x845e2f1336D686794f791203CA6733d51672F543';

        let items = [];
        items.push(createSkimToWithFee('0xd97a40434627D5c897790DE9a3d2E577Cba5F2E0', usdPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xd97a40434627D5c897790DE9a3d2E577Cba5F2E0', daiPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x553666081db0a8fdB337560009932852059d589A', usdPlus.address, 'USD+/USDbC', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function aerodrome() {

        let dex = 'Aerodrome';

        let items = [];
        items.push(createSkim('0x1b05e4e814b3431a48b8164c41eaC834d9cE2Da6', usdPlus.address, 'sAMM-DAI+/USD+', dex));
        items.push(createSkim('0x1b05e4e814b3431a48b8164c41eaC834d9cE2Da6', daiPlus.address, 'sAMM-DAI+/USD+', dex));
        items.push(createSkim('0x4a3636608d7Bc5776CB19Eb72cAa36EbB9Ea683B', usdPlus.address, 'sAMM-USD+/USDbC', dex));
        items.push(createBribeWithFee('0xdC0F1F6eCd03ec1C9FFC2A17BaBAbd313477b20E', usdPlus.address, 'vAMM-USD+/USDbC', dex, '0x3CAE2895a4fc57336Fc8FBab40D9e534874B17CE', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x607363389331f4B2D1b955d009506A67c565D75E', usdPlus.address, 'vAMM-USD+/stERN', dex, '0x6CEd86715f74ff109ea7f908eAc78AF4ab2f41ea', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x8E9154AC849e839d60299E85156bcb589De2693A', usdPlus.address, 'sAMM-DOLA/USD+', dex, '0xfC996Abd85Bcf64C3fA7DA20f33278Cd46f25ab7', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0xc3B5ac236fb5AbE245310FeCa2526F89667D4CAe', usdPlus.address, 'vAMM-YFX/USD+', dex, '0x9a0efa1968837474e23c73b60f29d705d2eb8789', 20, COMMON.rewardWallet));
        items.push(createBribe('0x61366A4e6b1DB1b85DD701f2f4BFa275EF271197', usdPlus.address, 'vAMM-OVN/USD+', dex, '0xD8847438AaEA2dD395bF2652a526B1CDd1F4E44D'));

        return items;
    }

    function moonbase() {

        let dex = 'Moonbase';

        let items = [];
        items.push(createSkim('0xB2ED81175a0371D52499E6881cEA697dcC1BAA11', usdPlus.address, 'DAI+-USD+', dex));
        items.push(createSkim('0xB2ED81175a0371D52499E6881cEA697dcC1BAA11', daiPlus.address, 'DAI+-USD+', dex));

        return items;
    }

};

module.exports.tags = ['SettingBasePayoutListener'];

