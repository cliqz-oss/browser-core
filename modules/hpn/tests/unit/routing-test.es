/* global chai */
/* global describeModule */
/* global require */

export default describeModule('hpn/routing',
  function () {
    return {};
  },

  () => {

    const expect = chai.expect;

    describe('createProxyList', () => {

      let createProxyList;

      beforeEach(function () {
        createProxyList = this.module().createProxyList;
      });

      it('should extract proxy list from input with non-empty host names', () => {
        const proxy1 = { dns: 'proxy1', ip: '1.2.3.4', ssl: true };
        const proxy2 = { dns: 'proxy2', ip: '5.6.7.8', ssl: false };
        const routingTable = [proxy1, proxy2, proxy1, proxy2];

        expect(createProxyList(routingTable)).to.deep.equal([proxy1, proxy2]);
      });

      it('should extract proxy list from input with missing host names', () => {
        const proxy1 = { dns: '', ip: '1.2.3.4', ssl: false };
        const proxy2 = { dns: '', ip: '5.6.7.8', ssl: false };
        const routingTable = [proxy1, proxy2, proxy1, proxy2];

        expect(createProxyList(routingTable)).to.deep.equal([proxy1, proxy2]);
      });

    });

    describe('getProxyVerifyUrl', () => {

      let getProxyVerifyUrl;

      beforeEach(function () {
        getProxyVerifyUrl = this.module().getProxyVerifyUrl;
      });

      it('should prefer https and domain names (over http and ip names)', () => {
        const url = getProxyVerifyUrl({
          host: 'proxy.cliqz.com',
          ip: '1.2.3.4',
          supportsHttps: true
        });
        expect(url).to.equal('https://proxy.cliqz.com/v2/verify');
      });

      it('should support falling back to http for proxies without certificates', () => {
        const url = getProxyVerifyUrl({
          host: 'proxy.cliqz.com',
          ip: '1.2.3.4',
          supportsHttps: false
        });
        expect(url).to.equal('http://proxy.cliqz.com/v2/verify');
      });

      it('should support falling back to IPs if the host name is missing)', () => {
        const url = getProxyVerifyUrl({
          host: '',
          ip: '1.2.3.4',
          supportsHttps: false
        });
        expect(url).to.equal('http://1.2.3.4/v2/verify');
      });

    });

  }
);
