/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names */

const commonMocks = require('./utils/common');
const waitFor = require('./utils/waitfor');

const prefs = commonMocks['core/prefs'].default;

const VERSION = '1.28.1';

export default describeModule('offers-v2/utils',
  () => ({
    ...commonMocks,
    './offers_configs': {
      default: {},
    },
  }),
  () => {
    describe('shouldKeepResource function', () => {
      let shouldKeepResource;

      describe('basic cases', () => {
        beforeEach(function () {
          shouldKeepResource = this.module().shouldKeepResource;
          prefs.set('offersUserGroup', '35');
        });

        afterEach(function () {
          prefs.clear('offersUserGroup');
        });

        it('should return true for zero resource', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
        });
        it('should return true for resource with smaller weight', () => {
          const r = shouldKeepResource(25);
          chai.expect(r).to.be.true;
        });
        it('should return false for resource with bigger weight', () => {
          const r = shouldKeepResource(45);
          chai.expect(r).to.be.false;
        });
      });

      describe('when offersUserGroup undefined', () => {
        beforeEach(function () {
          shouldKeepResource = this.module().shouldKeepResource;
          prefs.clear('offersUserGroup');
        });

        afterEach(function () {
          prefs.clear('offersUserGroup');
        });

        it('should return true for zero resource', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
        });
        it('should set offersUserGroup pref', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
          chai.expect(Number(prefs.get('offersUserGroup')) >= 0).to.be.true;
        });
        it('should return false for weight 100', () => {
          const r = shouldKeepResource(100);
          chai.expect(r).to.be.false;
        });
      });

      describe('when offersUserGroup smaller than zero', () => {
        beforeEach(function () {
          shouldKeepResource = this.module().shouldKeepResource;
          prefs.set('offersUserGroup', '-1');
        });

        afterEach(function () {
          prefs.clear('offersUserGroup');
        });

        it('should return true for zero resource', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
        });
        it('should set offersUserGroup pref', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
          chai.expect(Number(prefs.get('offersUserGroup')) >= 0).to.be.true;
        });
      });

      describe('when offersUserGroup in dev mode', () => {
        beforeEach(function () {
          shouldKeepResource = this.module().shouldKeepResource;
          prefs.set('offersUserGroup', '100');
        });

        afterEach(function () {
          prefs.clear('offersUserGroup');
        });

        it('should return true for weight 100', () => {
          const r = shouldKeepResource(100);
          chai.expect(r).to.be.true;
        });
      });

      describe('when offersUserGroup is equal zero', () => {
        beforeEach(function () {
          shouldKeepResource = this.module().shouldKeepResource;
          prefs.set('offersUserGroup', '0');
        });

        afterEach(function () {
          prefs.clear('offersUserGroup');
        });

        it('should return true for zero resource', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
        });
      });
    });

    describe('oncePerInterval function', () => {
      let oncePerIntervalCached;

      beforeEach(function () {
        const oncePerInterval = this.module().oncePerInterval;
        const f = () => 42;
        oncePerIntervalCached = oncePerInterval(f, 200);
      });

      it('should cache on second invocation', () => {
        const { cached } = oncePerIntervalCached({ key: 'foo' });
        chai.expect(cached).to.be.false;
        const { cached: newCached } = oncePerIntervalCached({ key: 'foo' });
        chai.expect(newCached).to.be.true;
      });

      it('should cache before interval ends', async () => {
        const { cached } = oncePerIntervalCached({ key: 'foo' });
        chai.expect(cached).to.be.false;
        await waitFor(() => {
          const { cached: newCached } = oncePerIntervalCached({ key: 'foo' });
          chai.expect(newCached).to.be.true;
        });
      });

      it('should not cache for new key', () => {
        const { cached } = oncePerIntervalCached({ key: 'foo' });
        chai.expect(cached).to.be.false;
        const { cached: newCached } = oncePerIntervalCached({ key: 'bar' });
        chai.expect(newCached).to.be.false;
      });

      it('should not cache after interval ends', async () => {
        const { cached } = oncePerIntervalCached({ key: 'foo' });
        chai.expect(cached).to.be.false;
        await waitFor(() => {
          const { cached: newCached } = oncePerIntervalCached({ key: 'foo' });
          chai.expect(newCached).to.be.false;
        });
      });
    });

    describe('getLatestOfferInstallTs function', () => {
      let getLatestOfferInstallTs;
      const oneSecond = 1000;

      beforeEach(function () {
        getLatestOfferInstallTs = this.module().getLatestOfferInstallTs;
      });

      it('check with empty prefs', () => {
        const diff = getLatestOfferInstallTs() - Number(Date.now());
        chai.expect(Math.abs(diff) < oneSecond).to.be.true;
      });

      describe('with prefs and old version of ext', () => {
        beforeEach(function () {
          prefs.set('offersInstallInfo', '0.1.1|777777777');
        });

        afterEach(function () {
          prefs.clear('offersInstallInfo');
        });

        it('check with old version', () => {
          const diff = getLatestOfferInstallTs() - Number(Date.now());
          chai.expect(Math.abs(diff) < oneSecond).to.be.true;
        });
      });

      describe('with not valid prefs', () => {
        beforeEach(function () {
          prefs.set('offersInstallInfo', `${VERSION}`);
        });

        afterEach(function () {
          prefs.clear('offersInstallInfo');
        });

        it('check with not valid prefs', () => {
          const diff = getLatestOfferInstallTs() - Number(Date.now());
          chai.expect(Math.abs(diff) < oneSecond).to.be.true;
        });
      });

      describe('with valid prefs', () => {
        beforeEach(function () {
          prefs.set('offersInstallInfo', `${VERSION}|7777777`);
        });

        afterEach(function () {
          prefs.clear('offersInstallInfo');
        });

        it('check with valid prefs', () => {
          chai.expect(getLatestOfferInstallTs()).to.be.eql(7777777);
        });
      });
    });

    describe('rewrite Google serp url', () => {
      let rewriteUrlForOfferMatching;

      beforeEach(function () {
        rewriteUrlForOfferMatching = this.module().rewriteUrlForOfferMatching;
      });

      it('/rewrite', () => {
        const url1 = 'https://www.GoOgLe.com/search?client=firefox-b-d&q=%6captop+kaufen';
        const url2 = 'https://www.GoOgLe.com/search?client=firefox-b-d&query=%6captop+kaufen';

        const newUrl1 = rewriteUrlForOfferMatching(url1);
        const newUrl2 = rewriteUrlForOfferMatching(url2);

        const expectedUrl = 'https://www.GoOgLe.com/search?q=%6captop+kaufen';
        chai.expect(newUrl1).to.eq(expectedUrl);
        chai.expect(newUrl2).to.eq(expectedUrl);
      });

      it('/retain url if not a google domain', () => {
        const url = 'https://www.nota.google.xxx.com/search?client=firefox-b-d&q=laptop+kaufen';

        const newUrl = rewriteUrlForOfferMatching(url);

        chai.expect(newUrl).to.eq(url);
      });

      it('/retain url if not a search path', () => {
        const url = 'https://www.google.com/SEARCH?client=firefox-b-d&q=laptop+kaufen';

        const newUrl = rewriteUrlForOfferMatching(url);

        chai.expect(newUrl).to.eq(url);
      });

      it('/retain url if no search parameter', () => {
        const url = 'https://www.google.com/search?client=firefox-b-d&Q=laptop+kaufen';

        const newUrl = rewriteUrlForOfferMatching(url);

        chai.expect(newUrl).to.eq(url);
      });

      it('/retain url if no search string at all', () => {
        const url = 'https://www.google.com/search';

        const newUrl = rewriteUrlForOfferMatching(url);

        chai.expect(newUrl).to.eq(url);
      });
    });
  });
