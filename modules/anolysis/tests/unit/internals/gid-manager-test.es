/* global chai */
/* global sinon */
/* global describeModule */

const moment = require('moment');
const mockDexie = require('../../../core/unit/utils/dexie');

const DEFAULT_DATE = '2017-01-02';

let yesterday = null;
let today = null;

const DATE_FORMAT = 'YYYY-MM-DD';
const getCurrentMoment = () => moment(today, DATE_FORMAT);

function setCurrentDate(date) {
  today = date;
  yesterday = getCurrentMoment().subtract(1, 'days').format(DATE_FORMAT);
}

function resetCurrentDate() {
  setCurrentDate(DEFAULT_DATE);
}

resetCurrentDate();


let sendDemographics;
let updateGID;


const BACKEND_MOCK = class Backend {
  updateGID(demographics) { return updateGID(demographics); }

  sendDemographics(demographics) { return sendDemographics(demographics); }
};

let mockDemographics;

export default describeModule('anolysis/internals/gid-manager',
  () => ({
    ...mockDexie,
    'platform/lib/moment': {
      default(str, format) {
        if (str === undefined) {
          return getCurrentMoment();
        }

        return moment(str, format);
      },
    },
    'core/crypto/random': {
      randomInt() { return 0; },
    },
    'core/events': {
      default: {
        pub() {},
      },
    },
    'core/console': { default: {} },
    'core/kord/inject': {
      default: {
        service() {
          return {
            push: () => {},
          };
        },
      },
    },
    'anolysis/internals/logger': {
      default: {
        // debug(...args) { console.log('DEBUG', ...args); },
        // log(...args) { console.log('LOG', ...args); },
        // error(...args) { console.log('ERROR', ...args); },
        debug() { },
        log() { },
        error() { },
      },
    },
    'anolysis/internals/backend-communication': {
      default: BACKEND_MOCK,
    },
    'anolysis/internals/synchronized-date': {
      DATE_FORMAT,
      getSynchronizedDateFormatted() {
        return today;
      },
      default() {
        return getCurrentMoment();
      },
    },
  }),
  () => {
    let storage;
    let gidManager;

    function getState() {
      const state = {};
      storage.gid.entries().forEach(({ key, value }) => {
        state[key] = value;
      });
      return state;
    }

    beforeEach(async function () {
      updateGID = () => Promise.reject();
      sendDemographics = () => Promise.reject();

      resetCurrentDate();

      const GIDManager = this.module().default;
      mockDemographics = () => ({});

      const config = new Map();
      config.set('demographics', mockDemographics());
      gidManager = new GIDManager(config);

      const Storage = (await this.system.import('anolysis/internals/storage/dexie')).default;
      storage = new Storage();
      await storage.init();
      await gidManager.init(storage.gid);
    });

    afterEach(() => storage.destroy());

    // Some helpers
    const performSendDemographics = async (date = today) => {
      // Pretend today is `date`.
      setCurrentDate(date);

      const demographics = '{"demographics": "demographics"}';
      sendDemographics = () => Promise.resolve(demographics);
      await gidManager.handleSendDemographics();
      await gidManager.setNewInstallDate(date);

      // Reset default value of current date.
      resetCurrentDate();

      return demographics;
    };

    describe('#handleSendDemographics', () => {
      it('succeeds if server returns answer', async () => {
        const demographics = await performSendDemographics();

        chai.expect(await gidManager.getGID()).to.be.eql(demographics);
        chai.expect(getState()).to.be.eql({
          anolysisDemographics: demographics,
          anolysisInstalled: today,
          anolysisLastAliveSignal: today,
          anolysisRawDemographics: '{}',
        });
      });

      it('fails if server query fails', async () => {
        sendDemographics = () => Promise.reject();

        await gidManager.handleSendDemographics();
        chai.expect(await gidManager.getGID()).to.be.eql('');
        chai.expect(getState()).to.be.eql({
          anolysisInstalled: today,
        });
      });
    });

    describe('#handleGidUpdate', () => {
      it('succeeds if server returns answer', async () => {
        const gid = 'gid';
        updateGID = () => Promise.resolve(gid);

        const demographics = await performSendDemographics(yesterday);

        await gidManager.handleGidUpdate();
        chai.expect(await gidManager.getGID()).to.be.eql(gid);
        chai.expect(getState()).to.be.eql({
          // From getGID
          anolysisInstalled: yesterday,

          // From handleGidUpdate
          anolysisGID: gid,
          anolysisLastGIDUpdate: today,

          // From handleSendDemographics
          anolysisDemographics: demographics,
          anolysisLastAliveSignal: today,
          anolysisRawDemographics: '{}',
        });
      });

      it('succeeds even if server query fails', async () => {
        // The rational being this behavior is that the user will continue using
        // the previous GID if any. If no GID was ever received, then empty
        // string is used as GID until a valid group can be retrieved from
        // backend.
        updateGID = () => Promise.reject();

        const demographics = await performSendDemographics(yesterday);

        await gidManager.handleGidUpdate();
        chai.expect(await gidManager.getGID()).to.be.eql('');
        chai.expect(getState()).to.be.eql({
          // From getGID
          anolysisInstalled: yesterday,

          // From handleSendDemographics
          anolysisDemographics: demographics,
          anolysisRawDemographics: '{}',
          anolysisLastAliveSignal: today,
        });
      });
    });

    describe('#getGID', () => {
      it('resolves to the same promise if called several times', async () => {
        // Mock `_getGID` to make sure it's called only once.
        sendDemographics = () => Promise.resolve('{}');
        updateGID = () => Promise.resolve('{}');
        const _getGID = sinon.spy(gidManager._getGID.bind(gidManager));
        gidManager._getGID = _getGID;

        // Several calls to `getGID` actually resolve to the same promise. So
        // that we cannot have several concurrent calls to this same function.
        for (let i = 0; i <= 100; i += 1) {
          gidManager.getGID();
        }

        await gidManager.getGID();
        chai.expect(_getGID).to.have.been.calledOnce;
      });

      const fromUpdateGID = 'gid';
      const fromSendDemographics = '{"demographics": "demographics"}';

      it('updates GID if needed', async () => {
        sendDemographics = sinon.spy(() => Promise.resolve(fromSendDemographics));
        updateGID = sinon.spy(() => Promise.resolve(fromUpdateGID));

        // Mock install date of the browser/extension using: demographics.install_date
        gidManager.demographics = { install_date: '2016-01-01' };

        // New install
        setCurrentDate('2016-01-01');
        await gidManager.getGID();
        chai.expect(sendDemographics).to.have.been.calledOnce;
        chai.expect(updateGID).to.not.have.been.called;

        // Get GID
        setCurrentDate('2016-01-02');
        chai.expect(await gidManager.getGID()).to.be.eql(fromUpdateGID);
        chai.expect(sendDemographics).to.have.been.calledTwice;
        chai.expect(updateGID).to.have.been.calledOnce;

        // Get GID should trigger update
        setCurrentDate('2016-01-03');
        updateGID = sinon.spy(() => Promise.resolve('gid2'));
        chai.expect(await gidManager.getGID()).to.be.eql('gid2');
        chai.expect(sendDemographics).to.have.been.calledThrice;
        chai.expect(updateGID).to.have.been.calledOnce;

        // Calling again on same day should not change anything
        const state = getState();
        chai.expect(await gidManager.getGID()).to.be.eql('gid2');
        chai.expect(sendDemographics).to.have.been.calledThrice;
        chai.expect(updateGID).to.have.been.calledOnce;
        chai.expect(getState()).to.be.eql(state);

        // Next day, GID server fails to answer, we expect GID to stay the same.
        // It will be retried later. In the meanwhile, the user keeps reporting
        // with its current group.
        setCurrentDate('2016-01-04');
        updateGID = sinon.spy(() => Promise.reject());
        chai.expect(await gidManager.getGID()).to.be.eql('gid2');
      });
    });
  });
