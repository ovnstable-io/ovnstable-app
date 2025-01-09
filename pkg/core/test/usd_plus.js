const {expect} = require("chai");
const {utils, BigNumber} = require("ethers");
const hre = require('hardhat');
const {getNamedAccounts, deployments, ethers} = require("hardhat");
const {createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {fromE18, fromE6, toE18, toE6} = require("@overnight-contracts/common/utils/decimals");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { boolean } = require("hardhat/internal/core/params/argumentTypes");
const { initWallet } = require("@overnight-contracts/common/utils/script-utils");


describe("Token", function () {

    let usdPlus;
    let account;
    let wallet;

    let user1;
    let user2;
    let user3;

    let nonRebaseUser1;
    let nonRebaseUser2;

    let fromAsset;
    let toAsset;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["UsdPlusToken", "RoleManager"]);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        // This is set up for localhost testing.
        await hre.network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [account],
        });

        wallet = await initWallet();

        user1 = await createRandomWallet();
        user2 = await createRandomWallet();
        user3 = await createRandomWallet();
        nonRebaseUser1 = await createRandomWallet();
        nonRebaseUser2 = await createRandomWallet();
        usdPlus = (await ethers.getContract("UsdPlusToken")).connect(wallet);
        await usdPlus.setExchanger(account);
        await usdPlus.setPayoutManager(account);

        await rebaseOptOut(nonRebaseUser1);
        await rebaseOptOut(nonRebaseUser2);

        let decimals = await usdPlus.decimals();
        fromAsset = decimals === 18 ? fromE18 : fromE6;
        toAsset = decimals === 18 ? toE18 : toE6;
    });


    async function rebaseOptIn(user) {
        await usdPlus.rebaseOptIn(user.address);
    }

    async function rebaseOptOut(user) {
        await usdPlus.rebaseOptOut(user.address);
    }


    async function transfer(from, to, amount) {
        await usdPlus.connect(from).transfer(to.address, toAsset(amount));
    }

    async function mint(user, amount) {
        await usdPlus.mint(user.address, toAsset(amount));
    }

    async function balanceOf(user, amount) {
        let balanceValue = await usdPlus.balanceOf(user.address);
        let balance = Math.ceil(fromAsset(balanceValue));
        expect(balance).to.eq(amount);
    }

    async function totalSupply(amount) {
        let totalSupply = await usdPlus.totalSupply();
        expect(fromAsset(totalSupply)).to.eq(amount);
    }

    async function changeTotalSupply(amount) {
        await usdPlus.changeSupply(toAsset(amount));
    }

    async function validateTotalSupply() {

        // Validate rebasing and non rebasing credit accounting by calculating'
        // total supply manually
        const calculatedTotalSupply = (await usdPlus.rebasingCreditsHighres())
            .mul(utils.parseUnits("1", 18))
            .div(await usdPlus.rebasingCreditsPerTokenHighres())
            .add(await usdPlus.nonRebasingSupply());


        const totalSupply = Math.ceil(fromAsset(await usdPlus.totalSupply()));
        await expect(Math.ceil(fromAsset(calculatedTotalSupply))).to.eq(totalSupply);
    }

    it("Should return the token name and symbol", async () => {
        expect(await usdPlus.name()).to.equal("USD+");
        expect(await usdPlus.symbol()).to.equal("USD+");
    });

    it("Should have 6 decimals", async () => {
        expect(await usdPlus.decimals()).to.equal(6);
    });

    it("Should return 0 balance for the zero address", async () => {
        expect(
            await usdPlus.balanceOf("0x0000000000000000000000000000000000000000")
        ).to.equal(0);
    });

    it("Should not allow anyone to mint USD+ directly", async () => {
        await expectRevert(
            usdPlus.connect(user1).mint(user1.address, toAsset(100)), "Caller is not the EXCHANGER")
    });

    it("Should allow a simple transfer of 1 USD+", async () => {
        await usdPlus.mint(user2.address, toAsset(100));
        await balanceOf(user1, 0);
        await balanceOf(user2, 100);
        await usdPlus.connect(user2).transfer(user1.address, toAsset(1));
        await balanceOf(user1, 1);
        await balanceOf(user2, 99);
    });

    it("Should allow a transferFrom with an allowance", async () => {
        await usdPlus.mint(user1.address, toAsset(1000));

        await usdPlus.connect(user1).approve(user2.address, toAsset(1000));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(toAsset(1000));

        await usdPlus.connect(user2).transferFrom(user1.address, user2.address, toAsset(1));
        await balanceOf(user2, 1);
        expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(toAsset(999));

    });


    it('Should return correct balance for small amounts at mint/burn', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        for (const amount of amounts) {
            await usdPlus.mint(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), amount);
            await usdPlus.burn(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), '0');
        }

    });

    it('Should return correct balance for small amounts at mint/burn after shifted rebasingCreditsPerToken', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        await mint(user2, 12345);
        await changeTotalSupply(12543);

        for (const amount of amounts) {
            await usdPlus.mint(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), amount);
            await usdPlus.burn(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), '0');
        }

    });

    it('Should return correct balance for small amounts at transfer', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        for (const amount of amounts) {
            await usdPlus.mint(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), amount);
            await usdPlus.connect(user1).transfer(user2.address, amount);
            expect(usdPlus.balanceOf(user2.address), amount);
            expect(usdPlus.balanceOf(user1.address), '0');
            await usdPlus.burn(user2.address, amount);
            expect(usdPlus.balanceOf(user2.address), '0');

        }

    });

    it('Should return correct balance for small amounts at transfer after shifted rebasingCreditsPerToken', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        await mint(user3, 12345);
        await changeTotalSupply(12543);

        for (const amount of amounts) {
            await usdPlus.mint(user1.address, amount);
            expect(usdPlus.balanceOf(user1.address), amount);
            await usdPlus.connect(user1).transfer(user2.address, amount);
            expect(usdPlus.balanceOf(user2.address), amount);
            expect(usdPlus.balanceOf(user1.address), '0');
            await usdPlus.burn(user2.address, amount);
            expect(usdPlus.balanceOf(user2.address), '0');

        }

    });

    it("Should transfer the correct amount from a rebasing account to a non-rebasing account and set creditsPerToken", async () => {

        await usdPlus.mint(nonRebaseUser1.address, toAsset(100));
        await usdPlus.mint(user1.address, toAsset(100));

        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 100);

        const creditsBalanceOf = await usdPlus.creditsBalanceOf(
            nonRebaseUser1.address
        );

        // Make rebase
        await usdPlus.changeSupply(toAsset(250));

        // Credits per token should be the same for the contract
        let creditsBalanceOfNew = await usdPlus.creditsBalanceOf(nonRebaseUser1.address);
        expect(creditsBalanceOf[0]).to.eq(creditsBalanceOfNew[0]);
        expect(creditsBalanceOf[1]).to.eq(creditsBalanceOfNew[1]);

        await validateTotalSupply();
    });

    it("Should transfer the correct amount from a rebasing account to a non-rebasing account with previously set creditsPerToken", async () => {

        await usdPlus.mint(user1.address, toAsset(100));
        await usdPlus.mint(nonRebaseUser1.address, toAsset(100));

        await balanceOf(user1, 100);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 100);
        await totalSupply(200);

        await usdPlus.changeSupply(toAsset(300));
        await totalSupply(250);
        await balanceOf(user1, 150);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 100);

        // Give contract 100 USD+ from User1
        await usdPlus.connect(user1).transfer(nonRebaseUser1.address, toAsset(50));
        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 150);

        await validateTotalSupply();

    });

    it("Should transfer the correct amount from a non-rebasing account without previously set creditssPerToken to a rebasing account", async () => {

        await usdPlus.mint(user1.address, toAsset(100));
        await usdPlus.mint(nonRebaseUser1.address, toAsset(100));

        await balanceOf(user1, 100);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 100);
        await totalSupply(200);

        // Transfer from contract to user
        await usdPlus.connect(nonRebaseUser1).transfer(user1.address, toAsset(100));
        await balanceOf(user1, 200);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 0);

        await validateTotalSupply();
    });

    it("Should transfer the correct amount from a non-rebasing account with previously set creditsPerToken to a rebasing account", async () => {


        await mint(user1, 100);
        await mint(nonRebaseUser1, 100);

        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 100);

        await changeTotalSupply(300);

        await balanceOf(user1, 150);
        await balanceOf(nonRebaseUser1, 100);

        await transfer(user1, nonRebaseUser1, 50);

        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 150);

        await transfer(nonRebaseUser1, user2, 150);

        await balanceOf(user1, 100);
        await balanceOf(user2, 150);
        await balanceOf(nonRebaseUser1, 0);

        await validateTotalSupply();

    });

    it("Should transfer the correct amount from a non-rebasing account to a non-rebasing account with different previously set creditsPerToken", async () => {

        await mint(user1, 100);
        await balanceOf(user1, 100);

        await mint(nonRebaseUser1, 50);
        await balanceOf(nonRebaseUser1, 50);

        await changeTotalSupply(300);

        await balanceOf(user1, 200);
        await transfer(user1, nonRebaseUser2, 50);
        await balanceOf(nonRebaseUser2, 50);

        await changeTotalSupply(400);
        await balanceOf(nonRebaseUser1, 50);
        await balanceOf(nonRebaseUser2, 50);
        await balanceOf(user1, 240);

        await transfer(nonRebaseUser1, nonRebaseUser2, 10);
        await balanceOf(nonRebaseUser2, 60);
        await balanceOf(nonRebaseUser1, 40);

        // Validate rebasing and non rebasing credit accounting by calculating'
        // total supply manually
        const creditBalanceMockNonRebasing = await usdPlus.creditsBalanceOf(
            nonRebaseUser1.address
        );
        const balanceMockNonRebasing = creditBalanceMockNonRebasing[0]
            .mul(utils.parseUnits("1", 18))
            .div(creditBalanceMockNonRebasing[1]);

        const creditBalanceMockNonRebasingTwo = await usdPlus.creditsBalanceOf(
            nonRebaseUser2.address
        );
        const balanceMockNonRebasingTwo = creditBalanceMockNonRebasingTwo[0]
            .mul(utils.parseUnits("1", 18))
            .div(creditBalanceMockNonRebasingTwo[1]);

        const calculatedTotalSupply = (await usdPlus.rebasingCreditsHighres())
            .mul(utils.parseUnits("1", 18))
            .div(await usdPlus.rebasingCreditsPerTokenHighres())
            .add(balanceMockNonRebasing)
            .add(balanceMockNonRebasingTwo);

        await expect(calculatedTotalSupply).to.equal(
            await usdPlus.totalSupply()
        );
    });

    it("Should transferFrom the correct amount from a rebasing account to a non-rebasing account and set creditsPerToken", async () => {

        await mint(user1, 100);

        await usdPlus.connect(user1).increaseAllowance(user2.address, toAsset(100));
        await usdPlus.connect(user2).transferFrom(user1.address, nonRebaseUser1.address, toAsset(100));

        await balanceOf(user1, 0);
        await balanceOf(user2, 0);
        await balanceOf(nonRebaseUser1, 100);

        const creditsBalanceOf = await usdPlus.creditsBalanceOf(
            nonRebaseUser1.address
        );

        // Make rebase
        await changeTotalSupply(200);

        // Credits per token should be the same for the contract

        let creditsBalanceOfNew = await usdPlus.creditsBalanceOf(nonRebaseUser1.address);
        expect(creditsBalanceOf[0]).to.eq(creditsBalanceOfNew[0]);
        expect(creditsBalanceOf[1]).to.eq(creditsBalanceOfNew[1]);
        await validateTotalSupply();

    });

    it("Should transferFrom the correct amount from a rebasing account to a non-rebasing account with previously set creditsPerToken", async () => {

        await mint(user1, 100);

        await usdPlus.connect(user1).increaseAllowance(user2.address, toAsset(150));
        await usdPlus.connect(user2).transferFrom(user1.address, nonRebaseUser1.address, toAsset(50));

        await balanceOf(user1, 50);
        await balanceOf(nonRebaseUser1, 50);

        await changeTotalSupply(200);

        await usdPlus.connect(user2).transferFrom(user1.address, nonRebaseUser1.address, toAsset(50));
        await balanceOf(nonRebaseUser1, 100);

        await validateTotalSupply();

    });

    it("Should transferFrom the correct amount from a non-rebasing account without previously set creditsPerToken to a rebasing account", async () => {

        await mint(nonRebaseUser1, 100);
        await mint(user1, 100);

        await balanceOf(nonRebaseUser1, 100);
        await balanceOf(user1, 100);

        await usdPlus.connect(nonRebaseUser1).increaseAllowance(user1.address, toAsset(100));
        await usdPlus.connect(user1).transferFrom(nonRebaseUser1.address, user1.address, toAsset(100));

        await balanceOf(nonRebaseUser1, 0);
        await balanceOf(user1, 200);

        await validateTotalSupply();

    });

    it("Should transferFrom the correct amount from a non-rebasing account with previously set creditsPerToken to a rebasing account", async () => {

        await mint(user1, 100);
        await mint(nonRebaseUser1, 100);

        await changeTotalSupply(300);

        await balanceOf(user1, 150);
        await balanceOf(nonRebaseUser1, 100);

        await transfer(user1, nonRebaseUser1, 50);

        await balanceOf(user1, 100);
        await balanceOf(nonRebaseUser1, 150);

        await usdPlus.connect(nonRebaseUser1).increaseAllowance(user1.address, toAsset(150));
        await usdPlus.connect(user1).transferFrom(nonRebaseUser1.address, user1.address, toAsset(150));

        await balanceOf(user1, 250);
        await balanceOf(nonRebaseUser1, 0);

        await validateTotalSupply();

    });

    it("Should maintain the correct balances when rebaseOptIn is called from non-rebasing contract", async () => {

        await mint(nonRebaseUser1, 100);
        await balanceOf(nonRebaseUser1, 100);

        const initialRebasingCredits = await usdPlus.rebasingCreditsHighres();
        const initialTotalSupply = await usdPlus.totalSupply();

        await changeTotalSupply(200);

        const totalSupplyBefore = await usdPlus.totalSupply();

        await balanceOf(nonRebaseUser1, 100);
        await rebaseOptIn(nonRebaseUser1);
        await balanceOf(nonRebaseUser1, 100);

        expect(await usdPlus.totalSupply()).to.equal(totalSupplyBefore);

        const rebasingCredits = await usdPlus.rebasingCreditsHighres();
        const rebasingCreditsPerTokenHighres =
          await usdPlus.rebasingCreditsPerTokenHighres();

        const creditsAdded = BigNumber.from(toAsset("100"))
          .mul(rebasingCreditsPerTokenHighres)
          .div(utils.parseUnits("1", 18));

        await expect(rebasingCredits).to.equal(
          initialRebasingCredits.add(creditsAdded)
        );

        expect(await usdPlus.totalSupply()).to.equal(initialTotalSupply);


        await validateTotalSupply();
    });

    it("Should maintain the correct balance when rebaseOptOut is called from rebasing EOA", async () => {


        await mint(user1, 100);
        await mint(user2, 100);

        await changeTotalSupply(400);

        const totalSupplyBefore = await usdPlus.totalSupply();

        const initialRebasingCredits = await usdPlus.rebasingCreditsHighres();
        const initialrebasingCreditsPerTokenHighres = await usdPlus.rebasingCreditsPerTokenHighres();

        await rebaseOptOut(user1);

        await balanceOf(user1, 200);
        await balanceOf(user2, 200);

        const rebasingCredits = await usdPlus.rebasingCreditsHighres();

        const creditsDeducted = BigNumber.from(toAsset("200"))
            .mul(initialrebasingCreditsPerTokenHighres)
            .div(utils.parseUnits("1", 18));

        await expect(rebasingCredits).to.equal(
            initialRebasingCredits.sub(creditsDeducted)
        );

        expect(await usdPlus.totalSupply()).to.equal(totalSupplyBefore);
    });

    it("Should not allow EOA to call rebaseOptIn when already opted in to rebasing", async () => {
        await expectRevert(usdPlus.rebaseOptIn(user1.address), "Account has not opted out");
    });

    it("Should not allow EOA to call rebaseOptOut when already opted out of rebasing", async () => {
        await rebaseOptOut(user1);
        await expectRevert(usdPlus.rebaseOptOut(user1.address), "Account has not opted in");
    });

    it("Should not allow Contract to call rebaseOptIn when already opted in to rebasing", async () => {
        await expectRevert(usdPlus.rebaseOptIn(usdPlus.address), "Account has not opted out");
    });

    it("Should not allow Contract to call rebaseOptOut when already opted out of rebasing", async () => {
        await rebaseOptOut(usdPlus);
        await expectRevert(usdPlus.rebaseOptOut(usdPlus.address), "Account has not opted in");
    });

    it("Should maintain the correct balance on a partial transfer for a non-rebasing account without previously set creditsPerToken", async () => {

        await mint(user1, 100);

        await rebaseOptIn(nonRebaseUser1);

        await transfer(user1, nonRebaseUser1, 100);
        await balanceOf(nonRebaseUser1, 100);

        await rebaseOptOut(user2);

        await transfer(nonRebaseUser1, user2, 50);
        await balanceOf(user2, 50);
        await balanceOf(nonRebaseUser1, 50);

        await transfer(nonRebaseUser1, user2, 25);
        await balanceOf(user2, 75);
        await balanceOf(nonRebaseUser1, 25);

    });

    it("Should maintain the same totalSupply on many transfers between different account types", async () => {

        await mint(nonRebaseUser1, 50);
        await mint(nonRebaseUser2, 50);

        await mint(user1, 100);
        await mint(user2, 100);

        await rebaseOptOut(user1);
        await rebaseOptIn(nonRebaseUser1);

        const nonRebasingEOA = user1;
        const rebasingEOA = user2;
        const nonRebasingContract = nonRebaseUser2;
        const rebasingContract = nonRebaseUser1;

        const allAccounts = [
            nonRebasingEOA,
            rebasingEOA,
            nonRebasingContract,
            rebasingContract,
        ];

        const initialTotalSupply = await usdPlus.totalSupply();
        for (let i = 0; i < 10; i++) {
            for (const fromAccount of allAccounts) {
                const toAccount =
                    allAccounts[Math.floor(Math.random() * allAccounts.length)];

                if (typeof fromAccount.transfer === "function") {
                    // From account is a contract
                    await fromAccount.transfer(
                        toAccount.address,
                        (await usdPlus.balanceOf(fromAccount.address)).div(2)
                    );
                } else {
                    // From account is a EOA
                    await usdPlus
                        .connect(fromAccount)
                        .transfer(
                            toAccount.address,
                            (await usdPlus.balanceOf(fromAccount.address)).div(2)
                        );
                }

                await expect(await usdPlus.totalSupply()).to.equal(initialTotalSupply);
            }
        }
    });

    it("Should revert a transferFrom if an allowance is insufficient", async () => {
        await mint(user1, 100);

        await usdPlus.connect(user1).approve(user2.address, toAsset(10));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(10));
        await expectRevert(usdPlus.connect(user2).transferFrom(user1.address, user2.address, toAsset(100)), "Allowance amount exceeds balance");
    });

    it("Should allow to increase/decrease allowance", async () => {


        await mint(user1, 1000);

        await usdPlus.connect(user1).approve(user2.address, toAsset(1000));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(1000));

        await usdPlus.connect(user1).decreaseAllowance(user2.address, toAsset(100));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(900));

        await usdPlus.connect(user1).increaseAllowance(user2.address, toAsset(20));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(920));

        // Decrease allowance more than what's there
        await usdPlus.connect(user1).decreaseAllowance(user2.address, toAsset(950));
        expect(await usdPlus.allowance(user1.address, user2.address)).to.equal(toAsset(0));

    });

    it("Should increase users balance on supply increase", async () => {

        await mint(user1, 99);
        await mint(user2, 1);

        await changeTotalSupply(102);

        let balanceUser1 = fromAsset(await usdPlus.balanceOf(user1.address));
        let balanceUser2 = fromAsset(await usdPlus.balanceOf(user2.address));

        expect(balanceUser1).to.eq(100.98);
        expect(balanceUser2).to.eq(1.02);
    });


  it("Should exact transfer to new contract accounts", async () => {

    // Add yield to so we need higher resolution
    await mint(user1, 125);

    // Helper to verify balance-exact transfers in
    const checkTransferIn = async (amount) => {
      const beforeReceiver = await usdPlus.balanceOf(nonRebaseUser1.address);
      await usdPlus.connect(user1).transfer(nonRebaseUser1.address, amount);
      const afterReceiver = await usdPlus.balanceOf(nonRebaseUser1.address);
      expect(beforeReceiver.add(amount)).to.equal(afterReceiver);
    };

    // Helper to verify balance-exact transfers out
    const checkTransferOut = async (amount) => {
      const beforeReceiver = await usdPlus.balanceOf(nonRebaseUser1.address);
      await usdPlus.connect(nonRebaseUser1).transfer(user1.address, amount);
      const afterReceiver = await usdPlus.balanceOf(nonRebaseUser1.address);
      expect(beforeReceiver.sub(amount)).to.equal(afterReceiver);
    };

    // In
    await checkTransferIn(1);
    await checkTransferIn(2);
    await checkTransferIn(5);
    await checkTransferIn(9);
    await checkTransferIn(100);
    await checkTransferIn(2);
    await checkTransferIn(5);
    await checkTransferIn(9);

    // Out
    await checkTransferOut(1);
    await checkTransferOut(2);
    await checkTransferOut(5);
    await checkTransferOut(9);
    await checkTransferOut(100);
    await checkTransferOut(2);
    await checkTransferOut(5);
    await checkTransferOut(9);
  });

    it("assetToCredit converts asset", async () => {

        await mint(user1, 99);
        await mint(user2, 1);

        let amount01 = {amount: "1",             credit: "1000000000"};
        let amount02 = {amount: "1000",          credit: "1000000000000"};
        let amount03 = {amount: "1000000",       credit: "1000000000000000"};
        let amount04 = {amount: "1000000000",    credit: "1000000000000000000"};
        let amount05 = {amount: "1000000000000", credit: "1000000000000000000000"};
        let amount06 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};
        let amount07 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};

        expect(await usdPlus.assetToCredit(user1.address, amount01.amount)).to.eq(amount01.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount02.amount)).to.eq(amount02.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount03.amount)).to.eq(amount03.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount04.amount)).to.eq(amount04.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount05.amount)).to.eq(amount05.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount06.amount)).to.eq(amount06.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount07.amount)).to.eq(amount07.credit);

        await changeTotalSupply(102);

        let amount11 = {amount: "1",             credit: "980392157"};
        let amount12 = {amount: "1000",          credit: "980392156863"};
        let amount13 = {amount: "1000000",       credit: "980392156862745"};
        let amount14 = {amount: "1000000000",    credit: "980392156862745098"};
        let amount15 = {amount: "1000000000000", credit: "980392156862745098039"};
        let amount16 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};
        let amount17 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};

        expect(await usdPlus.assetToCredit(user1.address, amount11.amount)).to.eq(amount11.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount12.amount)).to.eq(amount12.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount13.amount)).to.eq(amount13.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount14.amount)).to.eq(amount14.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount15.amount)).to.eq(amount15.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount16.amount)).to.eq(amount16.credit);
        expect(await usdPlus.assetToCredit(user1.address, amount17.amount)).to.eq(amount17.credit);
    });

    it("creditToAsset converts credit", async () => {

        await mint(user1, 99);
        await mint(user2, 1);

        let amount01 = {amount: "1",             credit: "1000000000"};
        let amount02 = {amount: "1000",          credit: "1000000000000"};
        let amount03 = {amount: "1000000",       credit: "1000000000000000"};
        let amount04 = {amount: "1000000000",    credit: "1000000000000000000"};
        let amount05 = {amount: "1000000000000", credit: "1000000000000000000000"};
        let amount06 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};
        let amount07 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913"};

        expect(await usdPlus.creditToAsset(user1.address, amount01.credit)).to.eq(amount01.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount02.credit)).to.eq(amount02.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount03.credit)).to.eq(amount03.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount04.credit)).to.eq(amount04.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount05.credit)).to.eq(amount05.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount06.credit)).to.eq(amount06.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount07.credit)).to.eq(amount07.amount);

        await changeTotalSupply(102);

        let amount11 = {amount: "1",             credit: "980392157"};
        let amount12 = {amount: "1000",          credit: "980392156863"};
        let amount13 = {amount: "1000000",       credit: "980392156862745"};
        let amount14 = {amount: "1000000000",    credit: "980392156862745098"};
        let amount15 = {amount: "1000000000000", credit: "980392156862745098039"};
        let amount16 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};
        let amount17 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913"};

        expect(await usdPlus.creditToAsset(user1.address, amount11.credit)).to.eq(amount11.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount12.credit)).to.eq(amount12.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount13.credit)).to.eq(amount13.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount14.credit)).to.eq(amount14.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount15.credit)).to.eq(amount15.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount16.credit)).to.eq(amount16.amount);
        expect(await usdPlus.creditToAsset(user1.address, amount17.credit)).to.eq(amount17.amount);
    });

    it("subCredits work correct", async () => {

        let amount1 = {credit1: "2000000000",       credit2: "1000000000",             error: "errorText", result: "1000000000"};
        let amount2 = {credit1: "1000000000000",    credit2: "1000000",                error: "errorText", result: "999999000000"};
        let amount3 = {credit1: "1000000000000000", credit2: "1000000000012345",       error: "errorText", result: "0"};
        let amount4 = {credit1: "1000000000012345", credit2: "1000000000000000",       error: "errorText", result: "12345"};
        let amount5 = {credit1: "1000000000000000", credit2: "1000000000000000",       error: "errorText", result: "0"};
        let amount6 = {credit1: "1000000000000",    credit2: "1000000000000000000000", error: "errorText", result: "errorText"};

        expect(await usdPlus.subCredits(user1.address, amount1.credit1, amount1.credit2, amount1.error)).to.eq(amount1.result);
        expect(await usdPlus.subCredits(user1.address, amount2.credit1, amount2.credit2, amount2.error)).to.eq(amount2.result);
        expect(await usdPlus.subCredits(user1.address, amount3.credit1, amount3.credit2, amount3.error)).to.eq(amount3.result);
        expect(await usdPlus.subCredits(user1.address, amount4.credit1, amount4.credit2, amount4.error)).to.eq(amount4.result);
        expect(await usdPlus.subCredits(user1.address, amount5.credit1, amount5.credit2, amount5.error)).to.eq(amount5.result);
        await expectRevert(usdPlus.subCredits(user1.address, amount6.credit1, amount6.credit2, amount6.error), amount6.result);
    });

    it("Approve/allowance different numbers", async () => {

        let amounts0 = [
            "115792089237316195423570985008687907853269984665640564039457584007913129639935", // max
            "115792089237316195423570985008687907853269984665640564039457584007913", // max / 1e9
            "115792089237316195423570985008687907853269984665640564039457", // max / 1e18
            "115792089237316195423570985008687907853269984665640", // max / 1e27
            "115792089237316195423570985008687907853269", // max / 1e36
            "115792089237316195423570985008688", // max / 1e45 + 1
        ];

        let amounts1 = [
            "115792089237316195423570985008687907853269984665640564039457584007913129639935", // max / 1e45
            "115792089237316195423570", // max / 1e54
            "115792089237316", // max / 1e63
            "115792", // max / 1e72
            "1"
        ];

        for (const amount of amounts0) {
            await usdPlus.connect(user1).approve(user2.address, amount);
            expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(amounts0[0]);
        }

        for (const amount of amounts1) {
            await usdPlus.connect(user1).approve(user2.address, amount);
            expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(amount);
        }

    });

    it("Approve large number and transferFrom", async () => {

        let amount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
        await mint(user1, 1000000);
        await usdPlus.connect(user1).approve(user2.address, amount);
        expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(amount);
        await usdPlus.connect(user2).transferFrom(user1.address, user2.address, 1000000);
        expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(amount);

    });

    describe('transferBlacklist', () => {
        let portfolioAgent;
        let roleManager;


        this.beforeEach(async () => {
            roleManager = (await ethers.getContract('RoleManager')).connect(wallet);
            portfolioAgent = await createRandomWallet()
            const role = await roleManager.PORTFOLIO_AGENT_ROLE()
            await roleManager.grantRole(role, portfolioAgent.address)
            await usdPlus.setRoleManager(roleManager.address)
        })

        describe('setTransferLock', () => {
            it('allows to set lock options for an address', async () => {
                const prevOpt = await usdPlus.lockOptionsPerAddress(user1.address)
                expect(prevOpt.lockSend).false
                expect(prevOpt.lockReceive).false

                await usdPlus.connect(portfolioAgent).setTransferLock(user1.address, {
                    lockSend: true,
                    lockReceive: true
                })

                const newOpt = await usdPlus.lockOptionsPerAddress(user1.address)
                expect(newOpt.lockSend).true
                expect(newOpt.lockReceive).true
            })

            it('reverts when try to send or receive lokens', async () => {
                await mint(user1, 1000000);
                await mint(user2, 1000000);

                // ALLOWED SEND & RECEIVE
                await usdPlus.connect(user1).callStatic.transfer(user2.address, 1)
                await usdPlus.connect(user2).callStatic.transfer(user1.address, 1)
                
                // LOCK SEND & RECEIVE
                await usdPlus.connect(portfolioAgent).setTransferLock(user1.address, {
                    lockSend: true,
                    lockReceive: true
                })

                await expectRevert(usdPlus.connect(user1).transfer(user2.address, 1), 'Send forbidden')
                await expectRevert(usdPlus.connect(user2).transfer(user1.address, 1), 'Receive forbidden')

                // LOCK SEND
                await usdPlus.connect(portfolioAgent).setTransferLock(user1.address, {
                    lockSend: true,
                    lockReceive: false
                })

                await expectRevert(usdPlus.connect(user1).transfer(user2.address, 1), 'Send forbidden')
                await usdPlus.connect(user2).callStatic.transfer(user1.address, 1)

                // LOCK RECEIVE
                await usdPlus.connect(portfolioAgent).setTransferLock(user1.address, {
                    lockSend: false,
                    lockReceive: true
                })

                await usdPlus.connect(user1).callStatic.transfer(user2.address, 1)
                await expectRevert(usdPlus.connect(user2).transfer(user1.address, 1), 'Receive forbidden')
            })

            describe('edge cases', () => {
                describe('when called not by portfolio agent', () => {
                    it(`reverts`, async () => {
                        await expectRevert(usdPlus.connect(user1).setTransferLock(user2.address, {
                            lockSend: false,
                            lockReceive: true
                        }), 'Restricted to Portfolio Agent')
                    })
                })

                describe('when new options == old options', () => {
                    it(`reverts`, async () => {
                        await expectRevert(
                            usdPlus.connect(portfolioAgent).setTransferLock(user1.address, 
                            await usdPlus.lockOptionsPerAddress(user1.address)
                        ), 'Duplicate')
                    })
                })
            })
        })

        describe('setTransferLockBatch', () => {
            let accounts = []

            beforeEach(async () => {
                accounts = [user1.address, user2.address, user3.address]
            })

            it('allows to set lock options for an array of addresses', async () => {
                for (let acc of accounts) {
                    const opt = await usdPlus.lockOptionsPerAddress(acc)
                    expect(opt.lockSend).false
                    expect(opt.lockReceive).false
                }

                await usdPlus.connect(portfolioAgent).setTransferLockBatch(accounts, [
                    {
                        lockSend: true,
                        lockReceive: true
                    },
                    {
                        lockSend: true,
                        lockReceive: true
                    },
                    {
                        lockSend: true,
                        lockReceive: true
                    },
                ])

                for (let acc of accounts) {
                    const opt = await usdPlus.lockOptionsPerAddress(acc)
                    expect(opt.lockSend).true
                    expect(opt.lockReceive).true
                }
            })

            it('reverts when try to send or receive lokens', async () => {
                await mint(user1, 1000000);
                await mint(user2, 1000000);

                // ALLOWED SEND & RECEIVE
                await usdPlus.connect(user1).callStatic.transfer(user2.address, 1)
                await usdPlus.connect(user2).callStatic.transfer(user1.address, 1)
                
                // LOCK SEND & RECEIVE
                await usdPlus.connect(portfolioAgent).setTransferLockBatch([user1.address], [
                    {
                        lockSend: true,
                        lockReceive: true
                    }
                ])

                await expectRevert(usdPlus.connect(user1).transfer(user2.address, 1), 'Send forbidden')
                await expectRevert(usdPlus.connect(user2).transfer(user1.address, 1), 'Receive forbidden')
            })

            describe('edge cases', () => {
                describe('when called not by admin', () => {
                    it(`reverts`, async () => {
                        await expectRevert(usdPlus.connect(user1).setTransferLockBatch([user2.address], [{
                            lockSend: false,
                            lockReceive: true
                        }]), 'Restricted to Portfolio Agent')
                    })
                })

                describe('when accounts len > MAX_LEN', () => {
                    const randomAddress = () => {
                        const wallet = new ethers.Wallet.createRandom()
                        return wallet.address
                    }

                    it(`reverts`, async () => {
                        let accs = []
                        let opts = []
                        const MAX_LEN = Number(await usdPlus.MAX_LEN())

                        for (let i = 0; i < MAX_LEN; ++i) {
                            accs.push(randomAddress())
                            opts.push({
                                lockSend: true,
                                lockReceive: true
                            })
                        }

                        await usdPlus.connect(portfolioAgent).callStatic.setTransferLockBatch(accs, opts)

                        accs.push(randomAddress())
                        opts.push({
                            lockSend: true,
                            lockReceive: true
                        })
                        await expectRevert(usdPlus.connect(portfolioAgent).setTransferLockBatch(accs, opts), 'Invalid len')
                    })
                })

                describe('when accounts len != opt len', () => {
                    it(`reverts`, async () => {
                        await expectRevert(usdPlus.connect(portfolioAgent).setTransferLockBatch(accounts, [{
                            lockReceive: true,
                            lockSend: false
                        }]), 'Len missmatch') 
                    })
                })

                describe('when accounts len == 0', () => {
                    it(`reverts`, async () => {
                        await expectRevert(usdPlus.connect(portfolioAgent).setTransferLockBatch([], []), 'Invalid len') 
                    })
                })

                describe('when new options == old options', () => {
                    it(`reverts`, async () => {
                        await expectRevert(
                            usdPlus.connect(portfolioAgent).setTransferLockBatch([user1.address], 
                            [await usdPlus.lockOptionsPerAddress(user1.address)]
                        ), 'Duplicate')

                        await expectRevert(
                            usdPlus.connect(portfolioAgent).setTransferLockBatch(accounts, 
                            [
                                {
                                    lockSend: true, 
                                    lockReceive: true
                                }, 
                                await usdPlus.lockOptionsPerAddress(user1.address), 
                                {
                                    lockSend: true, 
                                    lockReceive: true
                                }
                            ]
                        ), 'Duplicate')
                    })
                })
            })
        })

        describe('getters', () => {
            it('returns accounts having fees turned on', async () => {
                let len = await usdPlus.getBlacklistLength()
                expect(len).eq(0)

                let accounts = [user1.address, user2.address, user3.address]
                let options = [
                    {
                        lockSend: true,
                        lockReceive: false
                    },
                    {
                        lockSend: false,
                        lockReceive: true
                    },
                    {
                        lockSend: true,
                        lockReceive: true
                    },
                ]

                await usdPlus.connect(portfolioAgent).setTransferLockBatch(
                    accounts, 
                    options
                )

                len = await usdPlus.getBlacklistLength()
                let blackList = await usdPlus.getBlacklistSlice(0, len)

                expect(len).eq(3)
                expect(blackList[0].length).eq(len)
                for(let i = 0; i < blackList[0].length; ++i) {
                    expect(blackList[0][i]).eq(accounts[i])
                    expect(blackList[1][i].lockSend).eq(options[i].lockSend)
                    expect(blackList[1][i].lockReceive).eq(options[i].lockReceive)
                }

                let offset = 1
                let length = 1
                blackList = await usdPlus.getBlacklistSlice(offset, length)

                expect(blackList[0].length).eq(length)
                for(let i = 0; i < blackList[0].length; ++i) {
                    expect(blackList[0][i]).eq(accounts[i + offset])
                    expect(blackList[1][i].lockSend).eq(options[i + offset].lockSend)
                    expect(blackList[1][i].lockReceive).eq(options[i + offset].lockReceive)
                }

                // accounts get removed from blacklist of no locks are set to true
                // unlock user2
                options = [
                    {
                        lockSend: false,
                        lockReceive: true
                    },
                    {
                        lockSend: false,
                        lockReceive: false
                    },
                    {
                        lockSend: false,
                        lockReceive: true
                    },
                ]

                await usdPlus.connect(portfolioAgent).setTransferLockBatch(
                    accounts, 
                    options
                )

                blackList = await usdPlus.getBlacklistSlice(0, await usdPlus.getBlacklistLength())
                expect(blackList[0].length).eq(2)

                // only user1 and user3 left in blacklist
                expect((await usdPlus.getBlacklistAt(0)).account).eq(accounts[0])
                expect((await usdPlus.getBlacklistAt(1)).account).eq(accounts[2])

                await usdPlus.connect(portfolioAgent).setTransferLock(accounts[0], {
                    lockSend: false,
                    lockReceive: false
                })
                await usdPlus.connect(portfolioAgent).setTransferLock(accounts[2], {
                    lockSend: false,
                    lockReceive: false
                })

                blackList = await usdPlus.getBlacklistSlice(0, await usdPlus.getBlacklistLength())
                expect(blackList[0].length).eq(0)
            })

            describe('edge cases', () => {
                describe('when index out of bounds', () => {
                    it(`reverts`, async () => {
                        let accounts = [user1.address, user2.address, user3.address]
                        let options = [
                            {
                                lockSend: true,
                                lockReceive: false
                            },
                            {
                                lockSend: false,
                                lockReceive: true
                            },
                            {
                                lockSend: true,
                                lockReceive: true
                            },
                        ]

                        await usdPlus.connect(portfolioAgent).setTransferLockBatch(
                            accounts, 
                            options
                        )

                       await expectRevert(usdPlus.getBlacklistAt(4), 'Index out of bounds')
                       await expectRevert(usdPlus.getBlacklistSlice(2, 2), 'Query out of bounds')
                    })
                })
            })
        })
    })
});
