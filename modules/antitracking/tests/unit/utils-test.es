/* global chai, describeModule */

export default describeModule('antitracking/utils',
  () => ({
    'core/utils': {
      default: {}
    },
    './config': {
    },
    'core/encoding': {},
    'core/gzip': {},
    'core/prefs': {
      default: {}
    }
  }), function () {
    describe('truncateDomain', function () {
      let truncateDomain;
      beforeEach(function () {
        truncateDomain = this.module().truncateDomain;
      });

      it('does not change domain which is already tld+1', () => {
        chai.expect(truncateDomain({
          host: 'cliqz.com',
          subdomain: '',
          domain: 'cliqz.com',
        }, 1)).to.equal('cliqz.com');
      });

      it('shortens subdomain to tld+N (n=1, n < subdomains)', () => {
        chai.expect(truncateDomain({
          host: 'a.b.cliqz.com',
          subdomain: 'a.b',
          domain: 'cliqz.com',
        }, 1)).to.equal('b.cliqz.com');
      });

      it('shortens subdomain to tld+N (n=1, n == subdomains)', () => {
        chai.expect(truncateDomain({
          host: 'aa.cliqz.com',
          subdomain: 'aa',
          domain: 'cliqz.com',
        }, 1)).to.equal('aa.cliqz.com');
      });

      it('shortens subdomain to tld+N (n=2, n > subdomains)', () => {
        chai.expect(truncateDomain({
          host: 'aa.cliqz.com',
          subdomain: 'aa',
          domain: 'cliqz.com',
        }, 2)).to.equal('aa.cliqz.com');
      });

      it('shortens subdomain to tld+N (n=3, n < subdomains)', () => {
        chai.expect(truncateDomain({
          host: 'a.b.c.d.e.cliqz.com',
          subdomain: 'a.b.c.d.e',
          domain: 'cliqz.com',
        }, 3)).to.equal('c.d.e.cliqz.com');
      });

      it('shortens subdomain to tld+N (n=2, n > subdomains)', () => {
        chai.expect(truncateDomain({
          host: 'd.e.cliqz.com',
          subdomain: 'd.e',
          domain: 'cliqz.com',
        }, 3)).to.equal('d.e.cliqz.com');
      });

      it('leading . on domain', () => {
        chai.expect(truncateDomain({
          host: '.d.e.cliqz.com',
          subdomain: '.d.e',
          domain: 'cliqz.com',
        }, 1)).to.equal('e.cliqz.com');
      });

      it('removes double .', () => {
        chai.expect(truncateDomain({
          host: 'a..b..cliqz.com',
          subdomain: 'a..b.',
          domain: 'cliqz.com',
        }, 1)).to.equal('b.cliqz.com');
      });

      it('no general domain', () => {
        chai.expect(truncateDomain({
          host: 'd.e.cliqz.com',
          subdomain: 'd.e.cliqz.com',
          domain: '',
        }, 1)).to.equal('d.e.cliqz.com');
      });

      it('ip address', () => {
        chai.expect(truncateDomain({
          host: '8.8.4.4',
          isIp: true,
          domain: '',
        }, 1)).to.equal('8.8.4.4');
      });
    });
  }
);
