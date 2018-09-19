/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names */

const prefs = {};
const VERSION = '1.28.1';

export default describeModule('offers-v2/utils',
  () => ({
    './offers_configs': {
      default: {},
    },
    'core/crypto/random': {
      random: function () {
        return Math.random();
      }
    },
    'core/prefs': {
      default: {
        get: function (k, v) {
          return prefs[k] || v;
        },
        set: function(k, v) {
          prefs[k] = v;
        }
      }
    },
    'core/config': {
      default: {
        EXTENSION_VERSION: VERSION,
      }
    },
  }),
  () => {
    describe('shouldKeepResource function', () => {
      let shouldKeepResource;

      describe('basic cases', () => {
        beforeEach(function () {
          shouldKeepResource = this.module().shouldKeepResource;
          prefs.offersUserGroup = '35';
        });

        afterEach(function () {
          prefs.offersUserGroup = undefined;
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
          prefs.offersUserGroup = undefined;
        });

        afterEach(function () {
          prefs.offersUserGroup = undefined;
        });

        it('should return true for zero resource', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
        });
        it('should set offersUserGroup pref', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
          chai.expect(Number(prefs.offersUserGroup) > 0).to.be.true;
        });
        it('should return false for weight 100', () => {
          const r = shouldKeepResource(100);
          chai.expect(r).to.be.false;
        });
      });

      describe('when offersUserGroup smaller than zero', () => {
        beforeEach(function () {
          shouldKeepResource = this.module().shouldKeepResource;
          prefs.offersUserGroup = '-1';
        });

        afterEach(function () {
          prefs.offersUserGroup = undefined;
        });

        it('should return true for zero resource', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
        });
        it('should set offersUserGroup pref', () => {
          const r = shouldKeepResource(0);
          chai.expect(r).to.be.true;
          chai.expect(Number(prefs.offersUserGroup) >= 0).to.be.true;
        });
      });

      describe('when offersUserGroup in dev mode', () => {
        beforeEach(function () {
          shouldKeepResource = this.module().shouldKeepResource;
          prefs.offersUserGroup = '100'
        });

        afterEach(function () {
          prefs.offersUserGroup = undefined;
        });

        it('should return true for weight 100', () => {
          const r = shouldKeepResource(100);
          chai.expect(r).to.be.true;
        });
      });

      describe('when offersUserGroup is equal zero', () => {
        beforeEach(function () {
          shouldKeepResource = this.module().shouldKeepResource;
          prefs.offersUserGroup = '0'
        });

        afterEach(function () {
          prefs.offersUserGroup = undefined;
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
        const {cached} = oncePerIntervalCached({key: 'foo'})
        chai.expect(cached).to.be.false;
        const {cached: newCached} = oncePerIntervalCached({key: 'foo'})
        chai.expect(newCached).to.be.true;
      });

      it('should cache before interval ends', () => {
        const {cached} = oncePerIntervalCached({key: 'foo'})
        chai.expect(cached).to.be.false;
        new Promise(resolve => setTimeout(resolve, 100))
          .then(() => {
            const {cached: newCached} = oncePerIntervalCached({key: 'foo'})
            chai.expect(newCached).to.be.true;
          });
      });

      it('should not cache for new key', () => {
        const {cached} = oncePerIntervalCached({key: 'foo'})
        chai.expect(cached).to.be.false;
        const {cached: newCached} = oncePerIntervalCached({key: 'bar'})
        chai.expect(newCached).to.be.false;
      });

      it('should not cache after interval ends', () => {
        const {cached} = oncePerIntervalCached({key: 'foo'})
        chai.expect(cached).to.be.false;
        new Promise(resolve => setTimeout(resolve, 300))
          .then(() => {
            const {cached: newCached} = oncePerIntervalCached({key: 'foo'})
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
          prefs.offersInstallInfo = '0.1.1|777777777';
        });

        afterEach(function () {
          prefs.offersInstallInfo = undefined;
        });

        it('check with old version', () => {
          const diff = getLatestOfferInstallTs() - Number(Date.now());
          chai.expect(Math.abs(diff) < oneSecond).to.be.true;
        });
      });

      describe('with not valid prefs', () => {
        beforeEach(function () {
          prefs.offersInstallInfo = `${VERSION}`;
        });

        afterEach(function () {
          prefs.offersInstallInfo = undefined;
        });

        it('check with not valid prefs', () => {
          const diff = getLatestOfferInstallTs() - Number(Date.now());
          chai.expect(Math.abs(diff) < oneSecond).to.be.true;
        });
      });

      describe('with valid prefs', () => {
        beforeEach(function () {
          prefs.offersInstallInfo = `${VERSION}|7777777`;
        });

        afterEach(function () {
          prefs.offersInstallInfo = undefined;
        });

        it('check with valid prefs', () => {
          chai.expect(getLatestOfferInstallTs()).to.be.eql(7777777);
        });
      });
    });
  },
);
