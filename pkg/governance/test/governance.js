const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");

const hre = require("hardhat");

const {fromE18} = require("@overnight-contracts/common/utils/decimals");
const BigNumber = require('bignumber.js');
const chai = require("chai");
chai.use(require('chai-bignumber')());
const { solidity } =  require("ethereum-waffle");
chai.use(solidity);
let againstVotes = 0;
let forVotes = 1;
let abstainVotes = 2;

const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

describe("Governance", function () {


    let ovnToken;
    let account;
    let governator;
    let timeLock;
    let exchange;
    let user1;
    let waitBlock = 200;

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(['OvnToken','OvnGovernor', 'Exchange']);
        const {deploy} = deployments;

        const {deployer } = await getNamedAccounts();
        account = deployer;

        console.log('Account ' + account)

        ovnToken = await ethers.getContract('OvnToken');
        governator = await ethers.getContract('OvnGovernor');
        timeLock = await ethers.getContract('OvnTimelockController');


         await deploy('MockContract', {
            from: deployer,
            args: [],
            log: true,
        });

        exchange = await ethers.getContract('MockContract')


        await ovnToken.grantRole(await ovnToken.DEFAULT_ADMIN_ROLE(), timeLock.address);

        let addresses = await ethers.getSigners();
        user1 = addresses[1];
    });


    it("GET Governor settings", async function () {

        let votingDelay = await governator.votingDelay();
        let votingPeriod = await governator.votingPeriod();
        let proposalThreshold = await governator.proposalThreshold();
        let quorumNumerator = await governator.quorumNumerator();

        expect(votingDelay).to.eq(1);
        expect(votingPeriod).to.eq(waitBlock);
        expect(proposalThreshold).to.eq(0);
        expect(quorumNumerator).to.eq(75);
    });

    it("Governor settings: updateQuorumNumerator -> throw only Governance", async  function (){

        try {
            await governator.updateQuorumNumerator(1);
            expect.fail("Exception not thrown");
        } catch (e) {
            expect(e.message).to.eq('VM Exception while processing transaction: reverted with reason string \'Governor: onlyGovernance\'');
        }
    });

    it("Change Governor settings -> throw only Governance", async  function (){

        try {
            await governator.setVotingDelay(5);
            expect.fail("Exception not thrown");
        } catch (e) {
            expect(e.message).to.eq('VM Exception while processing transaction: reverted with reason string \'Governor: onlyGovernance\'');
        }
    });

    it("Overview", async function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await ovnToken.mint(account, votes);

        let totalSupply = new BigNumber(fromE18((await ovnToken.totalSupply()).toString()));
        expect(totalSupply.toNumber()).to.eq(200);

        await ovnToken.delegate(account)
        let totalDelegated = new BigNumber(fromE18((await ovnToken.getVotes(account)).toString()));
        expect(totalDelegated.toNumber()).to.eq(200);

    });

    it("Quorum -> sucess: 75%", async function () {

        let votes = ethers.utils.parseUnits("15.0", 18);
        let forVotesCount = "75.0";
        await ovnToken.mint(account, ethers.utils.parseUnits(forVotesCount, 18));
        await ovnToken.mint(user1.address, votes);
        let walletGovToken = ovnToken.connect(user1);

        await ovnToken.delegate(account)
        await walletGovToken.delegate(user1.address);

        const proposeTx = await governator.proposeExec(
            [exchange.address],
            [0],
            [exchange.interface.encodeFunctionData('setBuyFee', [25, 100000])],
            ethers.utils.id("Proposal #3: Set Buy fee"),
        );

        let quorum = fromE18((await governator.quorum(await ethers.provider.getBlockNumber('polygon') - 1)).toString());
        console.log('Quorum: ' + quorum);
        console.log('For votes: ' + forVotesCount)

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
        await governator.castVote(proposalId, forVotes);

        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < waitBlock; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        let state = proposalStates[await governator.state(proposalId)];
        expect(state).to.eq('Succeeded')
    });

    it("Quorum -> fail: 75%", async function () {

        let votes = ethers.utils.parseUnits("335.0", 18);
        let forVotesCount = "75.0";
        await ovnToken.mint(account, ethers.utils.parseUnits(forVotesCount, 18));
        await ovnToken.mint(user1.address, votes);
        let walletGovToken = ovnToken.connect(user1);

        await ovnToken.delegate(account)
        await walletGovToken.delegate(user1.address);

        const proposeTx = await governator.proposeExec(
            [exchange.address],
            [0],
            [exchange.interface.encodeFunctionData('setBuyFee', [25, 100000])],
            ethers.utils.id("Proposal #3: Set Buy fee"),
        );

        let quorum = fromE18((await governator.quorum(await ethers.provider.getBlockNumber('polygon') - 1)).toString());
        console.log('Quorum: ' + quorum);
        console.log('For votes: ' + forVotesCount)

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
        await governator.castVote(proposalId, forVotes);

        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < waitBlock; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        let state = proposalStates[await governator.state(proposalId)];
        expect(state).to.eq('Defeated')
    });


    it("Create propose -> call: proposals", async function () {

        await createTestProposal();

        let ids = await governator.getProposals();
        expect(ids.length).to.eq(1)
        console.log('ID: ' + ids[0])
    });

    it("Create propose -> voting -> success -> queue -> executed", async function () {

        const grant = ethers.utils.parseUnits("500.0", 18);
        await executeProposal([ovnToken.address], [ovnToken.interface.encodeFunctionData('mint', [account, grant])] )

        let number = await ovnToken.getVotes(account) / 10 ** 18;
        expect(number).to.eq(700)
    });

    it("Multi calls in propose", async  function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await ovnToken.mint(account, votes);
        await ovnToken.delegate(account)

        const proposeTx = await governator.proposeExec(
            [exchange.address, exchange.address, ovnToken.address],
            [0, 0, 0],
            [exchange.interface.encodeFunctionData('setBuyFee', [25, 100000]),
             exchange.interface.encodeFunctionData('setRedeemFee', [45, 1000000]),
             ovnToken.interface.encodeFunctionData('mint', [account, votes])],
            ethers.utils.id("Proposal #4: Multi proposals"),
        );

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine');
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;

        await governator.castVote(proposalId, forVotes);

        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < waitBlock; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        await governator.queueExec(proposalId);

        await exchange.grantRole(await exchange.DEFAULT_ADMIN_ROLE(), timeLock.address);

        await governator.executeExec(proposalId);

        let buyFee = await exchange.buyFee();
        let buyFeeDenominator = await exchange.buyFeeDenominator();

        expect(buyFee).to.eq(25);
        expect(buyFeeDenominator).to.eq(100000);

        let redeemFee = await exchange.redeemFee();
        let redeemFeeDenominator = await exchange.redeemFeeDenominator();

        expect(redeemFee).to.eq(45);
        expect(redeemFeeDenominator).to.eq(1000000);

        let balanceGovToken = new BigNumber(fromE18((await ovnToken.balanceOf(account)).toString()));
        expect(balanceGovToken.toNumber()).to.eq(300)
    });

    it("Change state contract by Proposal", async function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await ovnToken.mint(account, votes);
        await ovnToken.delegate(account)

        const proposeTx = await governator.proposeExec(
            [exchange.address],
            [0],
            [exchange.interface.encodeFunctionData('setBuyFee', [25, 100000])],
            ethers.utils.id("Proposal #3: Set Buy fee"),
        );

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;

        await governator.castVote(proposalId, forVotes);

        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < 200; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        await governator.queueExec(proposalId);

        await exchange.grantRole(await exchange.DEFAULT_ADMIN_ROLE(), timeLock.address);

        await governator.executeExec(proposalId);

        let buyFee = await exchange.buyFee();
        let buyFeeDenominator = await exchange.buyFeeDenominator();

        expect(buyFee).to.eq(25);
        expect(buyFeeDenominator).to.eq(100000);
    });


    it("Grant and revoke", async function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await ovnToken.mint(account, votes);
        await ovnToken.delegate(account);

        let adminRole = await exchange.DEFAULT_ADMIN_ROLE();
        await exchange.grantRole(adminRole, timeLock.address);
        await exchange.revokeRole(adminRole, account);

        let hasRole = await exchange.hasRole(adminRole, timeLock.address);
        expect(hasRole).to.true;

        hasRole = await exchange.hasRole(adminRole, account);
        expect(hasRole).to.false;

        let addresses = [exchange.address, exchange.address];
        let abis = [exchange.interface.encodeFunctionData('grantRole', [adminRole, account]), exchange.interface.encodeFunctionData('revokeRole', [adminRole, timeLock.address]) ] ;

        await executeProposal(addresses, abis);

        hasRole = await exchange.hasRole(adminRole, timeLock.address);
        expect(hasRole).to.false;

        hasRole = await exchange.hasRole(adminRole, account);
        expect(hasRole).to.true;
    });


    it("Execute not successful proposal -> revert", async function () {
        await expectRevert(governator.executeExec(await createTestProposal()), 'Governor: proposal not successful');
    });

    it("Queue not successful proposal -> revert", async function () {
        await expectRevert(governator.queueExec(await createTestProposal()), 'Governor: proposal not successful');
    });

    it("Only proposer can cancel proposal", async function () {
        await expectRevert(governator.connect(user1).cancel(await createTestProposal()), 'GovernorBravo: proposer above threshold');
    });


    it("Update timelock -> revert", async function () {
        await expectRevert(governator.connect(user1).updateTimelock(user1.address), 'Governor: onlyGovernance');
        await expectRevert(governator.updateTimelock(user1.address), 'Governor: onlyGovernance');
    });

    it("Update timelock -> sucess", async function () {
        expect(user1.address).not.equal(await governator.timelock());
        await executeProposal([governator.address], [governator.interface.encodeFunctionData('updateTimelock', [user1.address])]);
        expect(user1.address).to.equal(await governator.timelock());
    });


    it("Cancel proposal", async function () {
        let id = await createTestProposal();
        await governator.cancel(id);
        await expect(await getState(id)).to.equal('Canceled');
    });

    async function getState(proposalId){
        return proposalStates[await governator.state(proposalId)];

    }

    async function executeProposal(addresses, encode){

        let votes = ethers.utils.parseUnits("100.0", 18);
        await ovnToken.mint(account, votes);
        await ovnToken.delegate(account);

        let values = addresses.map(value=> 0);

        const proposeTx = await governator.proposeExec(
            addresses,
            values,
            encode,
            ethers.utils.id(addresses.toString() + encode.toString()),
        );

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;

        await governator.castVote(proposalId, forVotes);

        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < 200; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        await governator.queueExec(proposalId);
        await governator.executeExec(proposalId);

    }

    async function createTestProposal(){

        let votes = ethers.utils.parseUnits("100.0", 18);
        await ovnToken.mint(account, votes);
        await ovnToken.delegate(account)

        const grant = ethers.utils.parseUnits("500.0", 18);
        const newProposal = {
            grantAmount: grant,
            transferCalldata: ovnToken.interface.encodeFunctionData('mint', [account, grant]),
            descriptionHash: ethers.utils.id("Proposal #2: Give admin some tokens")
        };

        const proposeTx = await governator.proposeExec(
            [ovnToken.address],
            [0],
            [newProposal.transferCalldata],
            newProposal.descriptionHash,
        );

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        return tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;

    }
});


