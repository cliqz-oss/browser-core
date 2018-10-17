/* globals describeModule, chai */

const expect = chai.expect;

export default describeModule('webrequest-pipeline/strip-api-headers',
  () => ({}),
  function () {
    describe('#isSafeToRemoveHeaders', function () {
      let isSafeToRemoveHeaders;

      beforeEach(function () {
        isSafeToRemoveHeaders = this.module().isSafeToRemoveHeaders;
      });

      it('should modify requests to whitelisted hosts', () => {
        const safeToRemoveHosts = [
          'hpn-proxy-9f4c6918a70c48d49943b00f9b267439.proxy.cliqz.com',
          'hpn-proxy-1.ghostery.com',
          'collector-hpn.cliqz.com',
        ];
        for (const hostname of safeToRemoveHosts) {
          expect(isSafeToRemoveHeaders(hostname)).to.be.true;
        }
      });

      it('should not modify requests non-whitelisted hosts', () => {
        const protectedHosts = [
          'www.google.com',
          'www.amazon.com',
          'localhost',
          '127.0.0.1',
        ];
        for (const hostname of protectedHosts) {
          expect(isSafeToRemoveHeaders(hostname)).to.be.false;
        }
      });
    });
  }
);
