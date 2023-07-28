const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let params = {args: ["USD+", "USD+", 6]}

    await deployProxy('MockUsdPlusToken', deployments, save, params);

    console.log("MockUsdPlusToken created");
};

module.exports.tags = ['MockUsdPlusToken'];
