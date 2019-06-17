/* global chai */
/* global describeModule */

export default describeModule('hpnv2/digest',
  function () {
    return {
    };
  },

  () => {
    const expect = chai.expect;
    let flatten;
    let digest;

    describe('flatten', () => {
      beforeEach(function () {
        flatten = this.module().flatten;
        digest = this.module().digest;
      });

      it('simple digest', () => {
        expect(() => digest(['foo'], {})).to.throw('Found undefined field when calculating digest');
        expect(digest(['foo'], { foo: 5, bar: 6 })).to.deep.equal([5]);
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
  });
