/* global chai */
/* global describeModule */
/* global require */

export default describeModule('hpnv2/digest',
  function () {
    return {
    };
  },

  () => {
    const expect = chai.expect;
    let flatten;

    describe('flatten', () => {
      beforeEach(function () {
        flatten = this.module().flatten;
      });

      it('simple flatten', () => {
        const msg = {
          hello: {
            good: {
              bye: 7,
            },
            bad: 5,
            ugly: {}
          },
          abc: 1,
          def: {
            ghi: {
              jkl: {},
            },
          },
        };
        const flatMsg = [
          [['abc'], 1],
          [['def', 'ghi', 'jkl'], {}],
          [['hello', 'bad'], 5],
          [['hello', 'good', 'bye'], 7],
          [['hello', 'ugly'], {}],
        ];
        expect(JSON.stringify(flatten(msg))).to.equal(JSON.stringify(flatMsg));
      });
    });
  }
);
