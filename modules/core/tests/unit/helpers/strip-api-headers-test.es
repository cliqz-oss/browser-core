/* globals describeModule, chai */

const expect = chai.expect;

export default describeModule('core/helpers/strip-api-headers',
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
          'any-domain-ending-with.ghostery.net',
          'anotherdomain.ghostery.com',
          'anotherdomain.cliqz.com',
          'proxy39.cliqz.foxyproxy.com',
          'proxy10.ghostery.foxyproxy.com',
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
          'accountapi.ghostery.com',
          'consumerapi.ghostery.com',
          'accountapi.ghostery.net',
          'consumerapi.ghostery.net',
        ];
        for (const hostname of protectedHosts) {
          expect(isSafeToRemoveHeaders(hostname)).to.be.false;
        }
      });
    });
  });
