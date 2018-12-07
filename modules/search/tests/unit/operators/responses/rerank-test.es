/* global chai, describeModule */

const { resultsBeforeRerank, resultsAfterRerank } = require('./rerank-fixture');

const mock = {
  'search/operators/normalize': {
    getMainLink: ({ links }) => links[0],
  },
};

export default describeModule('search/operators/responses/rerank',
  () => mock,
  () => {
    describe('#rerank', function () {
      let rerank;

      beforeEach(function () {
        rerank = this.module().default;
      });

      it('rerank results should remove news story results if any', function () {
        chai.expect(rerank({ results: resultsBeforeRerank }))
          .to.deep.equal({ results: resultsAfterRerank });
      });
    });
  });
