const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");

let name = 'SwapSimulatorThruster';

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy(name, deployments, save);

    let simulator = await getContract(name, 'blast');

    await (await simulator.setSimulationParams(await getParams())).wait();
};

async function getParams() {
    return {
        strategy: "0x27217C61dde49cF390489eae8C678274a8C52c69", // StrategyThrusterSwap address
        factory: '0xa08ae3d3f4da51c22d3c041e468bdf4c61405aab'
    };
}

module.exports.tags = [name];
module.exports.swapSimulatorThruster = getParams;
