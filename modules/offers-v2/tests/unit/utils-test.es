/* global chai */
/* global describeModule */
/* eslint-disable func-names */

const commonMocks = require('./utils/common');

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
  });
