/* global describeModule */
/* global chai */

const mockDexie = require('../../core/unit/utils/dexie');

class EngineFake {
  constructor() { this.container = []; }
  get views() { return this; }
  async add(data) { this.container.push(data); }
  async each(callback) { this.container.forEach(callback); }
  async clear() { this.container = []; }
}

export default describeModule('offers-v2/patterns_stat',
  () => ({
    ...mockDexie,
  }),
  () => {
    let patternsStat;
    beforeEach(async function () {
      const PatternsStat = this.module().default;
      patternsStat = new PatternsStat();
      await patternsStat.init({ engine: new EngineFake() });
    });

    afterEach(function () {
      patternsStat = null;
    });

    describe('method add', () => {
      it('should add item correct', async () => {
        const data = {campaignId: 1, pattern: 'abc'};
        await patternsStat.add('views', data);
        const r = await patternsStat.group('views');
        chai.expect(r[0]).to.deep.eq({...data, counter: 1, type: 'views'});
      });
      it('should add item correct twice', async () => {
        const data = {campaignId: 1, pattern: 'abc'};
        await patternsStat.add('views', data);
        await patternsStat.add('views', data);
        const r = await patternsStat.group('views');
        chai.expect(r[0]).to.deep.eq({...data, counter: 2, type: 'views'});
      });
      it('should return empty set when moveAll data', async () => {
        const data = {campaignId: 1, pattern: 'abc'};
        await patternsStat.add('views', data);
        await patternsStat.moveAll('views');
        const r = await patternsStat.group('views');
        chai.expect(r).to.deep.eq([]);
      });
      it('should group items correctly', async () => {
        const data = {campaignId: 1, pattern: 'abc'};
        const data2 = {campaignId: 2, pattern: 'abz'};
        const data3 = {campaignId: 1, pattern: 'xyz'};
        await patternsStat.add('views', data);
        await patternsStat.add('views', data);
        await patternsStat.add('views', data2);
        await patternsStat.add('views', data2);
        await patternsStat.add('views', data3);
        const r = await patternsStat.group('views');
        chai.expect(r.find(x => x.pattern === 'abc'))
          .to.deep.eq({...data, counter: 2, type: 'views'});
        chai.expect(r.find(x => x.pattern === 'abz'))
          .to.deep.eq({...data2, counter: 2, type: 'views'});
        chai.expect(r.find(x => x.pattern === 'xyz'))
          .to.deep.eq({...data3, counter: 1, type: 'views'});
      });
      it('should moveAll data correctly', async () => {
        const data = {campaignId: 1, pattern: 'abc'};
        await patternsStat.add('views', data);
        const r = await patternsStat.moveAll('views');
        chai.expect(r).to.deep.eq([{...data, counter: 1, type: 'views'}]);
      });
    });
  },
);
