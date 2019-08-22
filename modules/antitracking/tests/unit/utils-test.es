/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

export default describeModule('antitracking/utils',
  () => ({
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
          hostname: 'cliqz.com',
          subdomain: '',
          domain: 'cliqz.com',
        }, 1)).to.equal('cliqz.com');
      });

      it('shortens subdomain to tld+N (n=1, n < subdomains)', () => {
        chai.expect(truncateDomain({
          hostname: 'a.b.cliqz.com',
          subdomain: 'a.b',
          domain: 'cliqz.com',
        }, 1)).to.equal('b.cliqz.com');
      });

      it('shortens subdomain to tld+N (n=1, n == subdomains)', () => {
        chai.expect(truncateDomain({
          hostname: 'aa.cliqz.com',
          subdomain: 'aa',
          domain: 'cliqz.com',
        }, 1)).to.equal('aa.cliqz.com');
      });

      it('shortens subdomain to tld+N (n=2, n > subdomains)', () => {
        chai.expect(truncateDomain({
          hostname: 'aa.cliqz.com',
          subdomain: 'aa',
          domain: 'cliqz.com',
        }, 2)).to.equal('aa.cliqz.com');
      });

      it('shortens subdomain to tld+N (n=3, n < subdomains)', () => {
        chai.expect(truncateDomain({
          hostname: 'a.b.c.d.e.cliqz.com',
          subdomain: 'a.b.c.d.e',
          domain: 'cliqz.com',
        }, 3)).to.equal('c.d.e.cliqz.com');
      });

      it('shortens subdomain to tld+N (n=2, n > subdomains)', () => {
        chai.expect(truncateDomain({
          hostname: 'd.e.cliqz.com',
          subdomain: 'd.e',
          domain: 'cliqz.com',
        }, 3)).to.equal('d.e.cliqz.com');
      });

      it('leading . on domain', () => {
        chai.expect(truncateDomain({
          hostname: '.d.e.cliqz.com',
          subdomain: '.d.e',
          domain: 'cliqz.com',
        }, 1)).to.equal('e.cliqz.com');
      });

      it('removes double .', () => {
        chai.expect(truncateDomain({
          hostname: 'a..b..cliqz.com',
          subdomain: 'a..b.',
          domain: 'cliqz.com',
        }, 1)).to.equal('b.cliqz.com');
      });

      it('no general domain', () => {
        chai.expect(truncateDomain({
          hostname: 'd.e.cliqz.com',
          subdomain: 'd.e.cliqz.com',
          domain: '',
        }, 1)).to.equal('d.e.cliqz.com');
      });

      it('ip address', () => {
        chai.expect(truncateDomain({
          hostname: '8.8.4.4',
          isIp: true,
          domain: '',
        }, 1)).to.equal('8.8.4.4');
      });
    });
  });
