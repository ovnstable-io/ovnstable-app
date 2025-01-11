const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { transferAsset } = require('@overnight-contracts/common/utils/script-utils');
const { ethers } = require('hardhat');
const { initWallet } = require('@overnight-contracts/common/utils/script-utils');

async function main() {
    await transferAsset(ARBITRUM.usdPlus, '0x764424B7Dc62c4cB57898Ee47DcDeEe8CCC5D5b8');

    const abi = [
        {
            inputs: [{ internalType: 'bytes32', name: '_campaignId', type: 'bytes32' }],
            name: 'campaign',
            outputs: [
                {
                    components: [
                        { internalType: 'bytes32', name: 'campaignId', type: 'bytes32' },
                        { internalType: 'address', name: 'creator', type: 'address' },
                        { internalType: 'address', name: 'rewardToken', type: 'address' },
                        { internalType: 'uint256', name: 'amount', type: 'uint256' },
                        { internalType: 'uint32', name: 'campaignType', type: 'uint32' },
                        { internalType: 'uint32', name: 'startTimestamp', type: 'uint32' },
                        { internalType: 'uint32', name: 'duration', type: 'uint32' },
                        { internalType: 'bytes', name: 'campaignData', type: 'bytes' },
                    ],
                    internalType: 'struct CampaignParameters',
                    name: '',
                    type: 'tuple',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
    ];
    let wallet = await initWallet();
    const DistributionCreator = new ethers.Contract('0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd', abi, wallet);

    const campaignIds = [
        '0x02526f2a035679bf7c317b632b7252a8bb20e7ae9c0f14fa116508163a3cbed0',
        '0x7c6c45dd33134a427e3ef13e29bc6db3ec271934eb371bee6cb191466bc05ba2',
        '0xf05e758a96e44585adeb3dc6429ee99c6f8736d3c06202606fec3ab98e1a0d2e',
        '0x6855916108462acda20529fde934cb1ae5610a7bbc443d407592e7ec13e7f582',
    ];

    for (const campaignId of campaignIds) {
        console.log('\nCampaign ID:', campaignId);
        console.log('------------------------');
        const campaignData = await DistributionCreator.campaign(campaignId);

        const formattedData = {
            campaignId: campaignData.campaignId,
            creator: campaignData.creator,
            rewardToken: campaignData.rewardToken,
            amount: ethers.utils.formatUnits(campaignData.amount),
            campaignType: campaignData.campaignType,
            startTimestamp: new Date(campaignData.startTimestamp * 1000).toISOString(),
            duration: `${campaignData.duration / (24 * 60 * 60)} days`,
            campaignData: campaignData.campaignData,
        };

        console.log(JSON.stringify(formattedData, null, 2));
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
