/* global chai */
/* global describeModule */
/* global require */

class EngineFake {
  constructor() { this.filters = ''; }

  onUpdateFilters([{ filters }]) { this.filters = filters; }

  match({ url }) {
    const result = this.filters.split('\n').includes(url);
    return { match: result };
  }
}

class LoaderFake {
  stop() {}
}

export default describeModule('offers-v2/offers/blacklist',
  () => ({
    '../../platform/lib/adblocker': { default: {} },
    '../../core/resource-loader': { default: {} },
    '../../core/config': { default: {} },
  }),
  () => {
    describe('black\'s basic cases', () => {
      let blacklist;

      describe('basic cases', () => {
        beforeEach(function () {
          const Blacklist = this.module().default;
          blacklist = new Blacklist({ engine: new EngineFake(), loader: new LoaderFake() });
        });
        afterEach(function () {
          blacklist.unload();
          blacklist = null;
        });

        it('should return false on empty blacklist', () => {
          const result = blacklist.has('https://focus.de');
          chai.expect(result).to.be.false;
        });
        it('should return false when does not match', () => {
          blacklist.update({ filters: ['https://focus.com'] });
          const result = blacklist.has('https://google.de');
          chai.expect(result).to.be.false;
        });
        it('should return true when match', () => {
          blacklist.update({ filters: ['https://focus.com'] });
          const result = blacklist.has('https://focus.com');
          chai.expect(result).to.be.true;
        });
        it('should return true when match and partly match many', () => {
          const filters = ['https://focus.com', 'https://focus.de', 'https://focus.fr'];
          blacklist.update({ filters: filters });
          const result = blacklist.has('https://focus.com');
          chai.expect(result).to.be.true;
        });
        it('should return false when partly match', () => {
          blacklist.update({ filters: ['https://focus.de'] });
          const result = blacklist.has('https://focus.com');
          chai.expect(result).to.be.false;
        });
      });
    });
  });
