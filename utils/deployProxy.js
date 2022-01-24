const {ethers, upgrades} = require("hardhat");
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');


async function deployProxy(contractName, deployments, save) {

    const contractFactory = await ethers.getContractFactory(contractName);

    let proxy;
    try {
        proxy = await ethers.getContract(contractName);
    } catch (e) {
    }

    if (!proxy) {
        console.log(`Proxy ${contractName} not found`)
        proxy = await upgrades.deployProxy(contractFactory, {kind: 'uups'});
        console.log(`Deploy ${contractName} Proxy done -> ` + proxy.address);
    } else {
        console.log(`Proxy ${contractName} found -> ` + proxy.address)
    }

    await new Promise(r => setTimeout(r, 5000));

    let upgradeTo = true;
    let impl;
    if (upgradeTo){
        // Deploy a new implementation and upgradeProxy to new;
        // You need have permission for role UPGRADER_ROLE;

        try {
            impl = await upgrades.upgradeProxy(proxy, contractFactory);
        } catch (e) {
            impl = await upgrades.upgradeProxy(proxy, contractFactory);
        }
        const currentImplAddress = await getImplementationAddress(ethers.provider, proxy.address);
        console.log(`Deploy ${contractName} Impl  done -> proxy [` + proxy.address + "] impl [" + currentImplAddress + "]");
    }else {

        //Deploy only a new implementation without call upgradeTo
        //For system with Governance
        impl = await sampleModule.deployImpl(hre, contractFactory, {kind: 'uups'}, proxy.address);
        console.log('Deploy impl done without upgradeTo -> impl [' + impl.impl + "]");


    }

    const artifact = await deployments.getExtendedArtifact(contractName);
    let proxyDeployments = {
        address: proxy.address,
        ...artifact
    }

    await save(contractName, proxyDeployments);
    return proxyDeployments;
}


module.exports = deployProxy;
