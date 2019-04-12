/* global chai */
/* global describeModule */
/* global require */
const adblocker = require('@cliqz/adblocker');
const commonMocks = require('../utils/common');

export default describeModule('offers-v2/offers/blacklist',
  () => ({
    ...commonMocks,
    'platform/lib/adblocker': {
      default: adblocker,
    },
    'core/resource-loader': {
      default: class LoaderFake {
        stop() {}
      },
    },
  }),
  () => {
    describe('black\'s basic cases', () => {
      let blacklist;

      describe('basic cases', () => {
        beforeEach(function () {
          const Blacklist = this.module().default;
          blacklist = new Blacklist();
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
