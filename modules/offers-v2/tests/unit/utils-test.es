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
    describe('getLatestOfferInstallTs function', () => {
      let getLatestOfferInstallTs;
      const oneSecond = 1000;

      beforeEach(function () {
        getLatestOfferInstallTs = this.module().getLatestOfferInstallTs;
      });

      it('check with empty prefs', () => {
        const diff = getLatestOfferInstallTs() - Number(Date.now());
        chai.expect(diff < oneSecond).to.be.true;
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
          chai.expect(diff < oneSecond).to.be.true;
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
          chai.expect(diff < oneSecond).to.be.true;
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
