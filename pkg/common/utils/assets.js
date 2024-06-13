const dotenv = require("dotenv");
dotenv.config({ path: __dirname + '/../../../.env' });

let COMMON = {
    rewardWallet: "0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46",
    treasureWallet: "0xe497285e466227f4e8648209e34b465daa1f90a0",
}

let BASE = {
    // tokens
    usdPlus: "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376",
    daiPlus: "0x65a2508C429a6078a7BC2f7dF81aB575BD9D9275",
    usdbc: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    weth: "0x4200000000000000000000000000000000000006",
    dai: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    bvm: '0xd386a121991E51Eab5e3433Bf5B1cF4C8884b47a',
    oBvm: '0x762eb51D2e779EeEc9B239FFB0B2eC8262848f3E',
    bswap: '0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9',
    well: '0xFF8adeC2221f9f4D8dfbAFa6B9a297d17603493D',
    alb: '0x1dd2d631c92b1aCdFCDd51A0F7145A50130050C4',
    bsx: '0xd5046B976188EB40f6DE40fB527F89c05b323385',
    xbsx: '0xE4750593d1fC8E74b31549212899A72162f315Fa',
    aero: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    comp: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0',
    sonne: '0x22a2488fE295047Ba13BD8cCCdBC8361DBD8cf7c',
    crvUsd: '0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93',
    moon: '0xeF0b2Ccb53A683fA48799245f376D6a60929f003',
    dola: '0x4621b7A9c75199271F773Ebd9A499dbd165c3191',
    sfrax: '0xe4796cCB6bB5DE2290C417Ac337F2b66CA2E770E',
    ovn: '0xA3d1a8DEB97B111454B294E2324EfAD13a9d8396',
    eusd: '0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4',
    wstEth: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',

    // seamlesss
    seamlessProvider: '0x0E02EB705be325407707662C6f6d3466E939f3a0',
    seamlessRewardsController: '0x91ac2fff8cbef5859eaa6dda661febd533cd3780',
    sUsdbc: '0x13a13869b814be8f13b86e9875ab51bda882e391',
    sDai: '0x37eF72fAC21904EDd7e69f7c7AC98172849efF8e',
    seam: '0x1c7a460413dd4e964f96d8dfc56e7223ce88cd85',


    // aave
    aaveProvider: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D',
    aUsdc: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB',
    // moonwell
    moonwellUnitroller: '0xfBb21d0380beE3312B33c4353c8936a0F13EF26C',
    moonwellUsdbc: '0x703843C3379b52F9FF486c9f5892218d2a065cC8',
    moonwellUsdc: '0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22',
    moonwellWeth: '0x628ff693426583D9a7FB391E54366292F509D457',
    moonwellDai: '0x73b06D8d18De422E269645eaCe15400DE7462417',
    // compound
    compoundUsdbc: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
    compoundRewards: '0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1',
    // sonne
    sonneUnitroller: '0x1DB2466d9F5e10D7090E7152B68d62703a2245F0',
    sonneUsdbc: '0x225886C9beb5eeE254F79d58bbD80cf9F200D4d0',
    sonneUsdc: '0xfd68F92B45b633bbe0f475294C1A86aecD62985A',
    sonneDai: '0xb864BA2aab1f53BC3af7AE49a318202dD3fd54C2',
    sonneWeth: '0x5F5c479fe590cD4442A05aE4a941dd991A633B8E',
    // routers
    inchRouterV5: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    velocimeterRouter: '0xE11b93B61f6291d35c5a2beA0A9fF169080160cF',
    baseSwapRouter: '0x327df1e6de05895d2ab08513aadd9313fe505d86',
    odosRouterV2: "0x19cEeAd7105607Cd444F5ad10dd51356436095a1",
    balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    alienBaseRouter: '0x7f2ff89d3C45010c976Ea6bb7715DC7098AF786E',
    swapBasedRouter: '0xaaa3b1F1bd7BCc97fD1917c18ADE665C5D31F066',
    aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    maverickRouter: '0x32AED3Bce901DA12ca8489788F3A99fCe1056e14',
    inchSwapper: "0x99eE224252138CB8e20f2a74c01ca4D4749cF2D1",
    moonbaseRouter: '0x4617695387bE48c3202a0A9165549c790C4A08Af',
    baseSwapV3Router: '0x1B8eea9315bE495187D873DA7773a874545D9D48',
    citadelRouter: "0x112f3f5CE89a46B9d7e18131e8E7CDdE313e4234",
    // oracles
    chainlinkUsdc: "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B",
    chainlinkDai: "0x591e79239a7d679378eC8c847e5038150364C78F",
    chainlinkWeth: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",

    aerodromeNpm: "0x827922686190790b37229fd06084350e74485b72",
};

let LINEA = {
    // tokens
    usdc: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
    weth: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f",
    dai: "0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5",
    usdt: "0xA219439258ca9da29E9Cc4cE5596924745e12B93",
    mendi: "0x43E8809ea748EFf3204ee01F08872F063e44065f",
    lvc: "0xcc22F6AA610D1b2a0e89EF228079cB3e1831b1D1",
    usdPlus: "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376",
    usdtPlus: "0x1E1F509963A6D33e169D9497b11c7DbFe73B7F13",
    // mendi
    mendiUsdc: "0x333D8b480BDB25eA7Be4Dd87EEB359988CE1b30D",
    mendiWeth: "0xAd7f33984bed10518012013D4aB0458D37FEE6F3",
    mendiUsdt: "0xf669C3C03D9fdF4339e19214A749E52616300E89",
    mendiUnitroller: "0x1b4d3b0421dDc1eB216D230Bc01527422Fb93103",
    // routers
    velocoreVault: "0x1d0188c4B276A09366D05d6Be06aF61a73bC7535",
    pancakeSwapV3Router: '0x678Aa4bF4E210cf2166753e054d5b7c31cc7fa86',
    odosRouterV2: '0x2d8879046f1559E53eb052E949e9544bCB72f414',
    lynexRouter: '0x610D2f07b7EdC67565160F587F37636194C34E74',
    // oracles
    pythOracleEth: '0x5A40180749902fB0ee29Dc32fED074F58367154C',
    pythOracleUsdc: '0x066948fce990b4aDdC3BAFa680338132A862b81A',
    pythOracleUsdt: '0x0714705a377C26aC60Bd69Dd6356609600F6F3c0',
};

let ZKSYNC = {
    usdPlus: "0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557",
    weth: "0x5aea5775959fbc2557cc8789bc1bf90a239d9a91",
    usdc: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    usdt: "0x493257fD37EDB34451f62EDf8D2a0C418852bA4C",
    nexonUsdc: "0x1181D7BE04D80A8aE096641Ee1A87f7D557c6aeb",
    vc: '0x99bBE51be7cCe6C8b84883148fD3D12aCe5787F2',
    rf: '0x5f7CBcb391d33988DAD74D6Fd683AadDA1123E4D',
    // reactor_fusion
    rfUnitroller: "0x23848c28Af1C3AA7B999fA57e6b6E8599C17F3f2",
    rfRewardsDistributor: "0x53C0DE201cab0b3f74EA7C1D95bD76F76EfD12A9",
    rfUsdc: '0x04e9Db37d8EA0760072e1aCE3F2A219988Fdac29',
    rfEth: '0xC5db68F30D21cBe0C9Eac7BE5eA83468d69297e6',
    // eralend
    eraUnitroller: "0x0171cA5b372eb510245F5FA214F5582911934b3D",
    eraUsdc: '0x1181D7BE04D80A8aE096641Ee1A87f7D557c6aeb',
    eraEth: '0x1BbD33384869b30A323e15868Ce46013C82B86FB',
    // swaps
    inchRouterV5: "0x6e2B76966cbD9cF4cC2Fa0D76d24d5241E0ABC2F",
    velocoreRouter: '0xd999e16e68476bc749a28fc14a0c3b6d7073f50c',
    muteRouter: '0x8B791913eB07C32779a16750e3868aA8495F5964',
    maverickRouter: '0x39E098A153Ad69834a9Dac32f0FCa92066aD03f4',
    syncswapRouter: '0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295',
    velocoreVault: '0xf5E67261CB357eDb6C7719fEFAFaaB280cB5E2A6',
    odosRouterV2: '0x4bBa932E9792A2b917D47830C93a9BC79320E4f7',
    pancakeNpm: '0xa815e2eD7f7d5B0c49fda367F249232a1B9D2883',
    // oracles
    pythOracleUsdc: '0x419E1428b4A6F22b860825e0B374607415636495',
    pythOracleUsdt: '0xC25cbAe9FCC39bFd46B81F2eB4c3cfb0dac4Cbe9',
    z0USDC: '0x016341e6Da8da66b33Fd32189328c102f32Da7CC',
    zerolendPoolUsdc: '0x4d9429246EA989C9CeE203B43F6d1C7D83e3B8F8', //'0x54AB34aB3C723bD2674c7082aA6fFcdfd3A5BEdc',
    earlyZERO: '0x9793eac2fECef55248efA039BEC78e82aC01CB2f',
    z0USDT: '0x9ca4806fa54984Bf5dA4E280b7AA8bB821D21505',
    zerolendRewardsController: '0x54AB34aB3C723bD2674c7082aA6fFcdfd3A5BEdc',
    zerolendPoolUsdt: '0x4d9429246EA989C9CeE203B43F6d1C7D83e3B8F8'
}

let ARBITRUM = {
    // tokens
    usdPlus: "0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65",
    daiPlus: "0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8",
    usdc: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    usdcCircle: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    crvUsd: "0x498Bf2B1e120FeD3ad3D42EA2165E9b73f99C1e5",
    usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    dai: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    usds: "0xD74f5255D557944cf7Dd0E45FF521520002D5748",
    ovn: "0xA3d1a8DEB97B111454B294E2324EfAD13a9d8396",
    arb: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    aDai: "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
    wbtc: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    frax: "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
    fraxbp: "0xC9B8a3FDECB9D5b218d02555a8Baf332E5B740d5",
    str: "0x5DB7b150c5F38c5F5db11dCBDB885028fcC51D68",
    agEur: "0xFA5Ed56A203466CbBC2430a43c66b9D8723528E7",
    sliz: "0x463913D3a3D3D291667D53B8325c598Eb88D3B0e",
    ram: "0xAAA6C1E32C55A7Bfa8066A6FAE9b42650F262418",
    wom: "0x7b5eb3940021ec0e8e463d5dbb4b7b09a89ddf96",
    wmx: "0x5190F06EaceFA2C552dc6BD5e763b81C73293293",
    silo: "0x0341C0C0ec423328621788d4854119B97f44E391",
    mgp: '0xa61F74247455A40b01b0559ff6274441FAfa22A3',
    chr: "0x15b2fb8f08e4ac1ce019eadae02ee92aedf06851",
    df: "0xaE6aab43C4f3E0cea4Ab83752C278f8dEbabA689",
    usx: "0x641441c631e2F909700d2f41FD87F0aA6A6b4EDb",
    slna: "0x1C28Edf9e0D66F3124f141A3cF3Ef1217F7019c4",
    ohm: "0xf0cb2dc0db5e6c66B9a70Ac27B06b878da017028",
    sushi: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
    wstEth: '0x5979D7b546E38E414F7E9822514be443A4800529',
    vrtx: "0x95146881b86B3ee99e63705eC87AfE29Fcc044D9",
    usdtPlus: '0xb1084db8D3C05CEbd5FA9335dF95EE4b8a0edc30',
    // aave
    aaveProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    rewardsController: "0x929EC64c34a17401F460460D4B9390518E5B473e",
    aUsdc: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    aUsdt: "0x6ab707Aca953eDAeFBc4fD23bA73294241490620",
    aEth: "0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8",
    // dForce
    dForceController: "0x8E7e9eA9023B81457Ae7E6D2a51b003D421E5408",
    dForceRewardDistributor: "0xF45e2ae152384D50d4e9b08b8A1f65F0d96786C3",
    // radiant
    radiantProvider: "0xe21B295ED46528eFD5F3EF66E18BC6ad1c87f003",
    // swaps
    quickSwapRouter: "0xf8bb9CE13Fd5312e6174c33e799b75BED679AEE0",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    horizaNpm: "0x39f16045432dc7cb6160269724821459b35938f9",
    pancakeNpm: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364",
    xcaliburRouter: "0x81c7ebbc66b5f9e1db29c4c427fe6339cc32d4ea",
    gmxRouter: "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064",
    gmxVault: "0x489ee077994B6658eAfA855C308275EAd8097C4A",
    gmxReader: "0x22199a49A999c351eF7927602CFB187ec3cae489",
    sterlingRouter: "0x0cbd3aea90538a1cf3c60b05582b691f6d2b2b01",
    solidLizardRouter: "0xF26515D5482e2C2FD237149bF6A653dA4794b3D0",
    kyberSwapRouter: "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83",
    inchRouter: "0x1111111254fb6c44bAC0beD2854e76F90643097d",
    inchRouterV5: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    ramsesRouter: "0xAAA87963EFeB6f7E0a2711F397663105Acb1805e",
    camelotRouter: "0xc873fecbd354f5a56e00e710b90ef4201db2448d",
    camelotRouterV3: "0x1F721E2E82F6676FCE4eA07A5958cF098D339e18",
    traderJoeRouter: "0xb4315e873dbcf96ffd0acd8ea43f689d8c20fb30",
    wombatRouter: '0xc4b2f992496376c6127e73f1211450322e580668',
    chronosRouter: "0xe708aa9e887980750c040a6a2cb901c37aa34f3b",
    odosRouter: "0xdd94018F54e565dbfc939F7C44a16e163FaAb331",
    odosRouterV2: "0xa669e7A0d4b3e4Fa48af2dE86BD4CD7126Be4e13",
    soluneaRouter: "0x8C36161aBE3F425F924D4F8E171d25e60ef2A0a4",
    balancerVault: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
    arbidexRouter: "0x7238fb45146bd8fcb2c463dc119a53494be57aac",
    positionHelperCamelot: "0xe458018ad4283c90fb7f5460e24c4016f81b8175",
    sushiswapRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    inchSwapper: "0x49398b8886d7708cF4BFDd305C4D622963d80F3d",
    // oracles
    oracleUsdc: "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
    oracleUsdt: "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
    oracleDai: "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB",
    oracleWbtc: "0xd0C7101eACbB49F3deCcCc166d238410D6D46d57",
    oracleWeth: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
    oracleEur: "0xA14d53bC1F1c0F31B4aA3BD109344E5009051a84",
    oracleArb: "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6",
    oracleOhm: "0x761aaeBf021F19F198D325D7979965D0c7C9e53b",
    oracleWstEthEth: "0xb523AE262D20A936BC152e6023996e46FDC2A95D",
    oracleWstEth: "0x5bDae5aE7cb82BFF02D27B013051F9f2a55efd24", // custom chainlink price = oracleWstEthEth * oracleWeth
    // pools
    zyber3Pool: "0x969f7699fbB9C79d8B61315630CDeED95977Cfb8",
    wombatBasePool: "0xc6bc781E20f9323012F6e422bdf552Ff06bA6CD1",
    wombatOvnPool: "0xCF20fDA54e37f3fB456930f02fb07FccF49e4849",
}

let BSC = {
    // coins
    usdPlus: "0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65",
    wBnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    busd: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    tusd: "0x14016E85a25aeb13065688cAFB43044C2ef86784",
    cone: "0xa60205802e1b5c6ec1cafa3cacd49dfeece05ac9",
    xvs: "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
    cake: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    btcb: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    the: "0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11",
    wom: "0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1",
    mgp: "0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa",
    rdnt: "0xf7DE7E8A6bd59ED41a4b5fe50278b3B7f31384dF",
    esRdnt: "0x016aBB5E48A7B64C2014f8834ecbE56CD72BF13D",
    // venus
    unitroller: "0xfD36E2c2a6789Db23113685031d7F16329158384",
    maximillion: '0x5efA1e46F4Fd738FF721F5AebC895b970F13E8A1',
    vBnb: "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
    vBusd: "0x95c78222B3D6e262426483D42CfA53685A67Ab9D",
    vUsdc: "0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8",
    vUsdt: "0xfD5840Cd36d94D7229439859C0112a4185BC0255",
    vBtcb: "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B",
    // swaps
    pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    synapseStableSwapPool: '0x28ec0B36F0819ecB5005cAB836F4ED5a2eCa4D13',
    wombatRouter: '0x19609B03C976CCA288fbDae5c21d4290e9a4aDD7',
    wombatPool: '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0',
    pancakeSwapV3Router: "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4",
    inchRouter: "0x1111111254fb6c44bAC0beD2854e76F90643097d",
    inchRouterV5: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    thenaRouter: "0xd4ae6eCA985340Dd434D38F470aCCce4DC78D109",
    thenaFusionRouter: '0x327Dd3208f0bCF590A66110aCB6e5e6941A4EfA0',
    odosRouter: "0x9f138be5aA5cC442Ea7cC7D18cD9E30593ED90b9",
    odosRouterV2: "0x89b8AA89FDd0507a99d334CBe3C808fAFC7d850E",
    // oracles
    chainlinkBusd: "0xcBb98864Ef56E9042e7d2efef76141f15731B82f",
    chainlinkUsdc: "0x51597f405303C4377E36123cBc172b13269EA163",
    chainlinkUsdt: "0xB97Ad0E74fa7d920791E90258A6E2085088b4320",
    chainlinkTusd: "0xa3334A9762090E827413A7495AfeCE76F41dFc06",
    chainlinkWbnb: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
    chainlinkBtcb: "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf",
}

let OPTIMISM = {
    // tokens
    usdPlus: "0x73cb180bf0521828d8849bc8CF2B920918e23032",
    daiPlus: "0x970D50d09F3a656b43E11B0D45241a84e3a6e011",
    ovn: "0x3b08fcd15280e7B5A6e404c4abb87F7C774D1B2e",
    op: "0x4200000000000000000000000000000000000042",
    sonne: "0x1DB2466d9F5e10D7090E7152B68d62703a2245F0",
    dai: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    wbtc: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
    usdt: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    weth: "0x4200000000000000000000000000000000000006",
    usdce: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    susd: "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9",
    lusd: "0xc40F949F8a4e094D1b49a23ea9241D289B7b2819",
    velo: "0x3c8B650257cFb5f272f799F5e2b4e65093a11a05",
    veloV2: "0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db",
    wstEth: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
    sushi: "0x3eaEb77b03dBc0F6321AE1b72b2E9aDb0F60112B",
    agEur: "0x9485aca5bbBE1667AD97c7fE7C4531a624C8b1ED",
    // aave
    aaveProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    rewardsController: "0x929EC64c34a17401F460460D4B9390518E5B473e",
    aUsdc: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    aUsdcn: "0x38d693cE1dF5AaDF7bC62595A37D667aD57922e5",
    aDai: "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
    aWbtc: "0x078f358208685046a11C85e8ad32895DED33A249",
    // sonne
    unitroller: "0x60CF091cD3f50420d50fD7f707414d0DF4751C58",
    soOp: "0x8cD6b19A07d754bF36AdEEE79EDF4F2134a8F571",
    soUsdc: "0xEC8FEa79026FfEd168cCf5C627c7f486D77b765F",
    soDai: "0x5569b83de187375d43FBd747598bfe64fC8f6436",
    soSusd: "0xd14451E0Fa44B18f08aeB1E4a4d092B823CaCa68",
    soLusd: "0xAFdf91f120DEC93c65fd63DBD5ec372e5dcA5f82",
    soUsdt: "0x5Ff29E4470799b982408130EFAaBdeeAE7f66a10",
    soWstEth: "0x26AaB17f27CD1c8d06a0Ad8E4a1Af8B1032171d5",
    soWeth: "0xf7B5965f5C117Eb1B5450187c9DcFccc3C317e8E",
    // granary
    granaryProvider: '0xdDE5dC81e40799750B92079723Da2acAF9e1C6D6',
    // swaps
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    velodromeRouter: '0x9c12939390052919af3155f41bf4160fd3666a6f',
    velodromeRouterV2: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858',
    curveExchange: "0x22D710931F01c1681Ca1570Ff016eD42EB7b7c2a",
    curve3Pool: "0x1337BedC9D22ecbe766dF105c9623922A27963EC",
    inchRouter: "0x1111111254760F7ab3F16433eea9304126DCd199",
    inchRouterV5: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    kyberSwapRouter: "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83",
    odosRouter: "0x69Dd38645f7457be13571a847FfD905f9acbaF6d",
    odosRouterV2: "0xCa423977156BB05b13A2BA3b76Bc5419E2fE9680",
    inchSwapper: "0x42a6079C56258137a48D0EeA0c015ACB5e74D55E",
    // oracles
    oracleDai: "0x8dBa75e83DA73cc766A7e5a0ee71F656BAb470d6",
    oracleUsdt: "0xecef79e109e997bca29c1c0897ec9d7b03647f5e",
    oracleUsdc: "0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3",
    oracleWeth: "0x13e3ee699d1909e989722e753853ae30b17e08c5",
    oracleOp: '0x0D276FC14719f9292D5C1eA2198673d1f4269246',
    oracleSusd: '0x7f99817d87baD03ea21E05112Ca799d715730efe',
    oracleLusd: '0x9dfc79Aaeb5bb0f96C6e9402671981CdFc424052',
    oracleWstEth: '0x698B585CbC4407e2D54aa898B2600B53C68958f7',
    oracleEur: "0x3626369857A10CcC6cc3A6e4f5C2f5984a519F20",
}

let POLYGON = {
    // tokens
    usdPlus: "0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f",
    idleUsdc: "0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1",
    usdc: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    wbtc: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    mai: "0xa3Fa99A148fA48D14Ed51d610c367C61876997F1",
    wmatic: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    usdt: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    dai: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    tusd: "0x2e1AD108fF1D8C782fcBbB89AAd783aC49586756",
    amUsdc: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    am3CRV: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171",
    am3CRVgauge: "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c",
    wMatic: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    crv: "0x172370d5Cd63279eFa6d502DAB29171933a610AF",
    mUsd: "0xE840B73E5287865EEc17d250bFb1536704B43B21",
    imUsd: "0x5290Ad3d83476CA6A2b178Cd9727eE1EF72432af",
    vimUsd: "0x32aBa856Dc5fFd5A56Bcd182b13380e5C855aa29",
    mta: "0xf501dd45a1198c2e1b5aef5314a68b9006d842e0",
    bpspTUsd: "0x0d34e5dD4D8f043557145598E4e2dC286B35FD4f",
    tUsd: "0x2e1ad108ff1d8c782fcbbb89aad783ac49586756",
    bal: "0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3",
    izi: "0x60d01ec2d5e98ac51c8b4cf84dfcce98d527c747",
    yin: "0x794Baab6b878467F93EF17e2f2851ce04E3E34C8",
    weth: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    dodo: "0xe4Bf2864ebeC7B7fDf6Eeca9BaCAe7cDfDAffe78",
    // swap routers
    quickSwapRouter: "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff",
    synapseSwapRouter: "0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    inchRouter: "0x1111111254fb6c44bAC0beD2854e76F90643097d",
    inchRouterV5: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    // strategies params
    crvAavePool: "0x445FE580eF8d70FF569aB36e80c647af338db351",
    aaveProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    balancerVault: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
    merkleOrchard: "0x0F3e0c4218b7b0108a3643cFe9D3ec0d4F57c54e",
    balancerPoolIdUsdcTusdDaiUsdt: "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068",
    balancerPoolIdWmaticUsdcWethBal: "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002",
    balancerPoolIdWmaticMtaWeth: "0x614b5038611729ed49e0ded154d8a5d3af9d1d9e00010000000000000000001d",
    uniswapV3PositionManager: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
    uniswapV3Pool: "0x3F5228d0e7D75467366be7De2c31D0d098bA2C23",
    izumiBoost: "0x01cc44fc1246d17681b325926865cdb6242277a5",
    uniswapNftToken: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    aaveCurve: "0x445fe580ef8d70ff569ab36e80c647af338db351",
    impermaxRouter: "0x7c79a1c2152665273ebd50e9e88d92a887a83ba0",
    imxbTokenQsUsdcUsdt: "0xEaB52C4eFBbB54505EB3FC804A29Dcf263668965",
    imxbTokenQsMaticUsdt: "0xed618c29abc8fa6ee05b33051b3cdb4a1efb7924",
    imxbTokenQsWethUsdt: "0x64ce3e18c091468acf30bd861692a74ce48a0c7c",
    imxbTokenQsMaiUsdt: "0x0065A0effbb58e4BeB2f3A40fDcA740F85585213",
    tetu: "0x255707B70BF90aa112006E1b07B9AeA6De021424",
    arrakisRouter: "0xbc91a120ccd8f80b819eaf32f0996dac3fa76a6c",
    // oracles
    oracleChainlinkUsdc: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7",
    oracleChainlinkUsdt: "0x0A6513e40db6EB1b165753AD52E80663aeA50545",
    oracleChainlinkDai: "0x4746dec9e833a82ec7c2c1356372ccf2cfcd2f3d",
    oracleChainlinkTusd: "0x7c5d415b64312d38c56b54358449d0a4058339d2",
    oracleChainlinkMatic: "0xab594600376ec9fd91f8e885dadf0ce036862de0",
}

let BLAST = {
    usdPlus: "0x4fEE793d435c6D2c10C135983BB9d6D4fC7B9BBd",
    usdb: "0x4300000000000000000000000000000000000003",
    weth: "0x4300000000000000000000000000000000000004",
    z0USDB: "0x23A58cbe25E36e26639bdD969B0531d3aD5F9c34",
    zerolendPoolUsdb: "0xa70B0F3C2470AbBE104BdB3F3aaa9C7C54BEA7A8",
    zerolandRewardsController: "0x94dc19a5bd17e84d90e63ff3fba9c3b76e5e4012",
    earlyZERO: "0x81b3184A3B5d4612F2c26A53Da8D99474B91B2D2"
}

function getAsset(name) {
    let assets = getAssets(process.env.ETH_NETWORK);
    return assets[name];
}

function getAssets(network) {
    let assets;
    switch (network) {
        case 'ARBITRUM':
            assets = ARBITRUM;
            break;
        case 'BSC':
            assets = BSC;
            break;
        case 'POLYGON':
            assets = POLYGON;
            break;
        case "OPTIMISM":
            assets = OPTIMISM;
            break
        case "ZKSYNC":
            assets = ZKSYNC;
            break
        case "LINEA":
            assets = LINEA;
            break
        case "BASE":
            assets = BASE;
            break
        case "BLAST":
            assets = BLAST;
            break
        default:
            throw new Error('Unknown network');
    }


    return assets;
}

module.exports = {
    ARBITRUM: ARBITRUM,
    BSC: BSC,
    POLYGON: POLYGON,
    ZKSYNC: ZKSYNC,
    BASE: BASE,
    LINEA: LINEA,
    OPTIMISM: OPTIMISM,
    BLAST: BLAST,
    COMMON: COMMON,
    getAsset: getAsset,
}
