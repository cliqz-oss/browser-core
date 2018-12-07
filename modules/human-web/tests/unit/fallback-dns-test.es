/* global chai, describeModule */

const expect = chai.expect;
const MockDate = require('mockdate');

function putClockForward(elapsedTimeInMs) {
  const now = new Date();
  MockDate.set(new Date(+now + elapsedTimeInMs));
}

export default describeModule('human-web/fallback-dns',
  () => ({}),
  () => {
    describe('FallbackDns', function () {
      let uut;

      const someHost = 'example.test';
      const someIp = '127.0.0.1';

      beforeEach(function () {
        const FallbackDns = this.module().default;
        uut = new FallbackDns();

        MockDate.set(new Date('2000-01-01'));
      });

      afterEach(function () {
        MockDate.reset();
      });

      it('should initially be empty', function () {
        return expect(uut.resolveHost(someHost)).to.be.rejected;
      });

      it('should find cached value', function () {
        uut.cacheDnsResolution('example1.test', '127.0.0.1');
        uut.cacheDnsResolution('example2.test', '127.0.0.2');
        return Promise.all([
          expect(uut.resolveHost('example1.test')).to.eventually.equal('127.0.0.1'),
          expect(uut.resolveHost('example2.test')).to.eventually.equal('127.0.0.2')]);
      });

      it('should evict old entries', function () {
        uut.cacheDnsResolution(someHost, someIp);
        return expect(uut.resolveHost(someHost)).to.be.fulfilled.then(() => {
          // TTL is still not exceeded
          putClockForward(uut.ttlInMs - 1);
          uut.flushExpiredCacheEntries();

          return expect(uut.resolveHost(someHost)).to.be.fulfilled.then(() => {
            // Now the TTL is exceeded and the cache should be cleared
            putClockForward(1);
            uut.flushExpiredCacheEntries();
            return expect(uut.resolveHost(someHost)).to.be.rejected;
          });
        });
      });
    });
  });
