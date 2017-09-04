/* global chai */
/* global describeModule */

export default describeModule('core/url',
  function () {
    return {
      'platform/url': {
        default: '[dynamic]',
      },
      'core/tlds': {
        default: {},
      },
      'core/LRU': {
        default: function () {},
      },
    };
  },
  function () {
    describe('url', function () {
      describe('compare', function () {
        let equals;
        beforeEach(function () {
          equals = this.module().equals;
        });
        it('with exactly same urls returns true', function () {
          chai.expect(equals('https://cliqz.com', 'https://cliqz.com')).to.be.true;
        });

        it('with missing urls returns false', function () {
          chai.expect(equals('https://cliqz.com', '')).to.be.false;
          chai.expect(equals('', 'https://cliqz.com')).to.be.false;
          chai.expect(equals('', '')).to.be.false;
        });

        it('with the same decoded urls return true', function () {
          chai.expect(equals('https://en.wikipedia.org/wiki/Murphy\'s_law', 'https://en.wikipedia.org/wiki/Murphy%27s_law')).to.be.true;
          chai.expect(equals('https://de.wikipedia.org/wiki/Stojanka_Novaković', 'https://de.wikipedia.org/wiki/Stojanka_Novakovi%C4%87')).to.be.true;
        });
      });
    });
  },
);
