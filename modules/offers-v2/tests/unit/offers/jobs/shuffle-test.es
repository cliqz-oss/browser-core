/* global chai */
/* global describeModule */
/* global require */

const commonMocks = require('../../utils/common');

export default describeModule('offers-v2/offers/jobs/shuffle',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('/job/shuffle', function () {
      let Shuffle;

      beforeEach(async function () {
        Shuffle = this.module().default;
      });

      it('/shuffle empty array', () => {
        const a = Shuffle.process([]);

        chai.expect(a).to.be.empty;
      });

      it('/shuffle one-element array', () => {
        const a = Shuffle.process(['foo']);

        chai.expect(a).to.eql(['foo']);
      });

      it('/shuffle array with several elements', () => {
        const a = Shuffle.process([9, 8, 7, 6, 5, 4, 3, 2, 1]);

        a.sort();
        chai.expect(a).to.eql([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      });
    });
  });
