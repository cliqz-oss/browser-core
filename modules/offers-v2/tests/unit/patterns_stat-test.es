/* global describeModule */
/* global chai */
/* global sinon */

const commonMocks = require('./utils/common');

export default describeModule('offers-v2/patterns_stat',
  () => ({
    ...commonMocks,
  }),
  () => {
    let patternsStat;
    beforeEach(async function () {
      const PatternsStat = this.module().default;
      patternsStat = new PatternsStat();
      await patternsStat.init(() => ({ getReason: () => ['pattern'] }));
      for (const signalName of patternsStat.getPatternSignals()) {
        // eslint-disable-next-line no-await-in-loop
        await patternsStat.moveAll(signalName);
      }
    });

    afterEach(function () {
      patternsStat = null;
    });

    describe('method add', () => {
      it('should add item correct', async () => {
        const data = { campaignId: 1, pattern: 'abc' };
        await patternsStat.add('success', data);
        const r = await patternsStat.group('success');
        delete data.id;
        chai.expect(r[0]).to.deep.eq({ ...data, counter: 1, type: 'success' });
      });
      it('should add item correct twice', async () => {
        const data = { campaignId: 1, pattern: 'abc' };
        await patternsStat.add('success', data);
        await patternsStat.add('success', data);
        const r = await patternsStat.group('success');
        delete data.id;
        chai.expect(r[0]).to.deep.eq({ ...data, counter: 2, type: 'success' });
      });
      it('should return empty set when moveAll data', async () => {
        const data = { campaignId: 1, pattern: 'abc' };
        await patternsStat.add('success', data);
        await patternsStat.moveAll('success');
        const r = await patternsStat.group('success');
        chai.expect(r).to.deep.eq([]);
      });
      it('should group items correctly', async () => {
        const data = { campaignId: 1, pattern: 'abc' };
        const data2 = { campaignId: 2, pattern: 'abz' };
        const data3 = { campaignId: 1, pattern: 'xyz' };
        await patternsStat.add('success', data);
        await patternsStat.add('success', data);
        await patternsStat.add('success', data2);
        await patternsStat.add('success', data2);
        await patternsStat.add('success', data3);
        const r = await patternsStat.group('success');
        delete data.id;
        delete data2.id;
        delete data3.id;
        chai.expect(r.find(x => x.pattern === 'abc'))
          .to.deep.eq({ ...data, counter: 2, type: 'success' });
        chai.expect(r.find(x => x.pattern === 'abz'))
          .to.deep.eq({ ...data2, counter: 2, type: 'success' });
        chai.expect(r.find(x => x.pattern === 'xyz'))
          .to.deep.eq({ ...data3, counter: 1, type: 'success' });
      });
      it('should moveAll data correctly', async () => {
        const data = { campaignId: 1, pattern: 'abc' };
        await patternsStat.add('success', data);
        const r = await patternsStat.moveAll('success');
        delete data.id;
        chai.expect(r).to.deep.eq([{ ...data, counter: 1, type: 'success' }]);
      });
    });

    describe('/ reinterpret signals', () => {
      let addFunc;

      beforeEach(() => {
        addFunc = sinon.spy();
        patternsStat.add = addFunc;
      });

      function returnPatternsNextTime(patterns) {
        patternsStat.offerIdToReason = () => ({
          getReason: () => patterns
        });
      }

      function getExpectedForPattern(pattern) {
        return ['landing', { campaignId: 'cid', pattern }];
      }

      it('/ report each pattern', async () => {
        returnPatternsNextTime(['Pattern1', 'Pattern2', 'Pattern3']);

        patternsStat.reinterpretCampaignSignalSync('cid', 'oid', 'landing');

        chai.expect(addFunc.firstCall.args).to.eql(getExpectedForPattern('Pattern1'));
        chai.expect(addFunc.secondCall.args).to.eql(getExpectedForPattern('Pattern2'));
        chai.expect(addFunc.thirdCall.args).to.eql(getExpectedForPattern('Pattern3'));
      });

      it('/ report for a offer which is not anymore in db', async () => {
        patternsStat.offerIdToReason = () => null;

        patternsStat.reinterpretCampaignSignalSync('cid', 'oid', 'landing');

        chai.expect(addFunc.firstCall.args).to.eql(getExpectedForPattern('<null>'));
      });

      it('/ report about missed information object', async () => {
        returnPatternsNextTime(null);

        patternsStat.reinterpretCampaignSignalSync('cid', 'oid', 'landing');

        chai.expect(addFunc.firstCall.args).to.eql(getExpectedForPattern('<null>'));
      });

      it('/ report about empty information object', async () => {
        returnPatternsNextTime([]);

        patternsStat.reinterpretCampaignSignalSync('cid', 'oid', 'landing');

        chai.expect(addFunc.firstCall.args).to.eql(getExpectedForPattern('<empty>'));
      });
    });
  });
