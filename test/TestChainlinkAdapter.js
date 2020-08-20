const ChainlinkAdapter = artifacts.require('ChainlinkAdapter');
const FakeAggregator = artifacts.require('FakeAggregator');

const {
    bn,
    tryCatchRevert,
    toEvents,
    expect,
    address0x,
} = require('./Helper.js');
const { assert } = require('chai');

function toDecimals (stringNumber, decimals) {
    return bn(stringNumber).mul(bn(10).pow(bn(decimals)));
}

contract('chainLinkAdapter Contract', function (accounts) {
    const owner = accounts[0];

    let chainlinkAdapter;
    let aggregator1;
    let aggregator2;
    let aggregator3;
    let aggregator4;
    let aggregator5;

    async function setAggregator (symbolA, symbolB, aggregator, decimalsA, decimalsB) {
        const currencyA = await chainlinkAdapter.symbolToBytes32(symbolA);
        const currencyB = await chainlinkAdapter.symbolToBytes32(symbolB);
        await chainlinkAdapter.setAggregator(currencyA, currencyB, aggregator, decimalsA, decimalsB);
    };

    async function symbolToBytes32 (symbol) {
        const currency = await chainlinkAdapter.symbolToBytes32(symbol);
        return currency;
    }

    before('Deploy contracts', async function () {
        chainlinkAdapter = await ChainlinkAdapter.new();

        aggregator1 = await FakeAggregator.new('RCN', 'BTC');
        await aggregator1.setLatestAnswer(bn('5770000000000'));
        await setAggregator('RCN', 'BTC', aggregator1.address, '18', '18');

        aggregator2 = await FakeAggregator.new('BTC', 'ARS');
        await aggregator2.setLatestAnswer(bn('1538461538000000000000000'));
        await setAggregator('BTC', 'ARS', aggregator2.address, '18', '18');

        aggregator3 = await FakeAggregator.new('USDC', 'ETH');
        await aggregator3.setLatestAnswer(bn('2438295000000000'));
        await setAggregator('USDC', 'ETH', aggregator3.address, '18', '18');

        aggregator4 = await FakeAggregator.new('ETH', 'USD');
        await aggregator4.setLatestAnswer(bn('4094400000'));
        await setAggregator('ETH', 'USD', aggregator4.address, '18', '8');

        aggregator5 = await FakeAggregator.new('GBP', 'USD');
        await aggregator5.setLatestAnswer(bn('131019000'));
        await setAggregator('GBP', 'USD', aggregator5.address, '18', '8');
    });

    describe('Test getRate() ', async function () {
        it('getPairLastRate ', async function () {
            const currencyA = await symbolToBytes32('RCN');
            const currencyB = await symbolToBytes32('BTC');
            const rate = await chainlinkAdapter.getPairLastRate(currencyA, currencyB);
            expect(rate).to.eq.BN('5770000000000');
        });
        it('Get Rate from aggregator 1 using getRate() ', async function () {
            const currencyA = await symbolToBytes32('RCN');
            const currencyB = await symbolToBytes32('BTC');
            const rate = await chainlinkAdapter.getRate([currencyA, currencyB]);
            expect(rate).to.eq.BN('5770000000000');
        });
        it('Get combined rate using getRate() path = 3 ', async function () {
            const currencyA = await symbolToBytes32('RCN');
            const currencyB = await symbolToBytes32('BTC');
            const currencyC = await symbolToBytes32('ARS');
            const combinedRate = await chainlinkAdapter.getRate([currencyA, currencyB, currencyC]);

            const rateA = await chainlinkAdapter.getRate([currencyA, currencyB]);
            const rateB = await chainlinkAdapter.getRate([currencyB, currencyC]);
            const decimalsrateA = await chainlinkAdapter.decimals(currencyB);
            const combRate = bn(rateA).mul(bn(rateB)).div(toDecimals('1', decimalsrateA));

            expect(combinedRate).to.eq.BN(combRate);
        });
        it('Get reverse rate', async function () {
            const currencyA = await symbolToBytes32('BTC');
            const currencyB = await symbolToBytes32('RCN');
            assert(await chainlinkAdapter.aggregators(currencyA, currencyB), address0x);
            assert(await chainlinkAdapter.aggregators(currencyB, currencyA) !== address0x);
            const rate = await chainlinkAdapter.getRate([currencyA, currencyB]);

            const rateDirect = await chainlinkAdapter.getRate([currencyB, currencyA]);
            const decimalsA = await chainlinkAdapter.decimals(currencyA);
            const decimalsB = await chainlinkAdapter.decimals(currencyB);
            const reverseRate = (toDecimals('1', decimalsA)).mul(toDecimals('1', decimalsB)).div(rateDirect);

            expect(rate).to.eq.BN(reverseRate);
        });
        it('Get combined rate using getRate() path = 4 and reverseRate', async function () {
            const currencyA = await symbolToBytes32('USDC');
            const currencyB = await symbolToBytes32('ETH');
            const currencyC = await symbolToBytes32('USD');
            const currencyD = await symbolToBytes32('GBP');
            const rate = await chainlinkAdapter.getRate([currencyA, currencyB, currencyC, currencyD]);

            const rateA = await chainlinkAdapter.getRate([currencyA, currencyB]);
            const rateB = await chainlinkAdapter.getRate([currencyB, currencyC]);
            const rateC = await chainlinkAdapter.getRate([currencyC, currencyD]);

            const decimalsRateA = await chainlinkAdapter.decimals(currencyB);
            const combRate1 = bn(rateA).mul(bn(rateB)).div(toDecimals('1', decimalsRateA));
            const decimalscombRate1 = await chainlinkAdapter.decimals(currencyC);
            const combRate2 = bn(combRate1).mul(bn(rateC)).div(toDecimals('1', decimalscombRate1));

            expect(rate).to.eq.BN(combRate2);
        });
    });
    describe('test reverts ', async function () {
        it('Only owner can call set aggregator', async function () {
            const currencyA = await symbolToBytes32('symA');
            const currencyB = await symbolToBytes32('symB');
            const aggregator = accounts[1];
            await tryCatchRevert(
                () => chainlinkAdapter.setAggregator(
                    currencyA,
                    currencyB,
                    aggregator,
                    18,
                    18,
                    { from: accounts[1] }
                ),
                'Ownable: caller is not the owner'
            );
        });
        it('Aggregator 0x0 is not valid', async function () {
            const currencyA = await symbolToBytes32('symA');
            const currencyB = await symbolToBytes32('symB');
            const aggregator = address0x;
            await tryCatchRevert(
                () => chainlinkAdapter.setAggregator(
                    currencyA,
                    currencyB,
                    aggregator,
                    18,
                    18,
                    { from: owner }
                ),
                'Aggregator 0x0 is not valid'
            );
        });
        it('ChainLinkAdapter/Aggregator not set, path not resolved', async function () {
            const currencyA = await symbolToBytes32('RCN');
            const currencyB = await symbolToBytes32('MANA');
            await tryCatchRevert(
                () => chainlinkAdapter.getRate(
                    [currencyA, currencyB],
                    { from: owner }
                ),
                'ChainLinkAdapter/Aggregator not set, path not resolved'
            );
        });
    });
    describe('Function setAggregator', function () {
        it('Should set a new Aggregator', async function () {
            const currencyA = await symbolToBytes32('symA');
            const currencyB = await symbolToBytes32('symB');
            const aggregator = aggregator1.address;
            const SetAggregator = await toEvents(
                chainlinkAdapter.setAggregator(
                    currencyA,
                    currencyB,
                    aggregator,
                    18,
                    18,
                    { from: owner }
                ),
                'SetAggregator'
            );
            assert.equal(SetAggregator._symbolA, currencyA);
            assert.equal(SetAggregator._symbolB, currencyB);
            assert.equal(SetAggregator._aggregator, aggregator);
            assert.equal(SetAggregator._decimalsA, 18);
            assert.equal(SetAggregator._decimalsB, 18);
        });
    });
});