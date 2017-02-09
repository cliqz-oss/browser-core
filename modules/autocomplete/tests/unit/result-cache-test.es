let BACKEND_RESULT, CACHED_RESULT, EXPIRED_RESULT, resultCache;
function getBackendResults() {
  return new Promise(resolve => resolve(BACKEND_RESULT));
}
export default describeModule('autocomplete/result-cache',
  function () {
    return {};
  },
  function () {
    describe('Result Cache', function () {
      beforeEach(function () {
        BACKEND_RESULT = { response: { max_age: 100 } };
        CACHED_RESULT = { response: { max_age: 100 }, expiresAt: Date.now() + 1000 };
        EXPIRED_RESULT = { response: { max_age: 100 }, expiresAt: Date.now() };
        const ResultCache = this.module().default;
        resultCache = new ResultCache();
      });
      it('Should get new results from the backend', function () {
        return chai.expect(resultCache.getResult('new query', getBackendResults)).to.eventually.equal(BACKEND_RESULT);
      });
      it('Should store new results in cache with expiration value', function (done) {
        resultCache.getResult('new query', getBackendResults).then(results => {
          chai.expect(resultCache.cache.get('new query')).to.equal(BACKEND_RESULT);
          chai.expect(resultCache.cache.get('new query')).to.have.property('expiresAt');
          done();
        });
      });
      it('Should get stored result from cache', function () {
        resultCache.cache.set('old query', CACHED_RESULT);
        return chai.expect(resultCache.getResult('old query')).to.eventually.equal(CACHED_RESULT);
      });
      it('Should set isClientCached to true for cached results', function () {
        resultCache.cache.set('old query', CACHED_RESULT);
        return chai.expect(resultCache.getResult('old query'))
                .to.eventually.have.property('response')
                .that.have.property('isClientCached').that.is.ok;
      });
      it('Should ignore expired cache', function () {
        resultCache.cache.set('expired', EXPIRED_RESULT);
        return chai.expect(resultCache.getResult('expired', getBackendResults)).to.eventually.equal(BACKEND_RESULT)
      });
      it('Should be able to clear all cache on request', function () {
        resultCache.cache.set('expired', EXPIRED_RESULT);
        resultCache.cache.set('not expired', CACHED_RESULT);
        resultCache.clear();
        chai.expect(resultCache.cache.get('expired')).to.be.not.ok;
        chai.expect(resultCache.cache.get('not expired')).to.be.not.ok;
      });
    });
});
