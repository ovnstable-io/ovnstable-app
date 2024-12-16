const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract, showM2M, execTimelock, transferAsset, getERC20ByAddress, transferETH } = require("@overnight-contracts/common/utils/script-utils");


let name = 'SwapSimulatorFenix';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await transferETH(10, '0x8df424e487De4218B347e1798efA11A078fecE90');


    await deployProxy(name, deployments, save);

    let simulator = await getContract(name, 'blast');

    await (await simulator.setSimulationParams(await getParams())).wait();
};

async function getParams() {
    return {
        strategy: '0xa09A8e94FBaAC9261af8f34d810D96b923B559D2', 
        factory: '0x5accac55f692ae2f065ceddf5924c8f6b53cdaa8'
    };
}

module.exports.tags = [name];
module.exports.swapSimulatorThruster = getParams;