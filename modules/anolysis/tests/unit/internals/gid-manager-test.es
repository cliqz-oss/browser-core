/* global chai */
/* global sinon */
/* global describeModule */


const mockDexie = require('../../../core/unit/utils/dexie');
const moment = require('moment');

const DEFAULT_DATE = '2017-01-02';

let sixMonthsAgo = null;
let yesterday = null;
let today = null;

const DATE_FORMAT = 'YYYY-MM-DD';
const getCurrentMoment = () => moment(today, DATE_FORMAT);

function setCurrentDate(date) {
  today = date;
  yesterday = getCurrentMoment().subtract(1, 'days').format(DATE_FORMAT);
  sixMonthsAgo = getCurrentMoment().subtract(6, 'months').format(DATE_FORMAT);
}

function resetCurrentDate() {
  setCurrentDate(DEFAULT_DATE);
}

resetCurrentDate();


let reappearingUser;
let newInstall;
let activeUserSignal;
let updateGID;


const BACKEND_MOCK = class Backend {
  reappearingUser(demographics) { return reappearingUser(demographics); }
  newInstall(demographics) { return newInstall(demographics); }
  activeUserSignal(demographics) { return activeUserSignal(demographics); }
  updateGID(demographics) { return updateGID(demographics); }
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
    'core/database': {
      default: class Database { destroy() { return Promise.resolve(); } }
    },
    'core/events': {
      default: {
        pub() {},
      },
    },
    'core/utils': {
      default: {},
    },
    'core/console': { default: {} },
    'anolysis/internals/logger': {
      default: {
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
      reappearingUser = () => Promise.reject();
      newInstall = () => Promise.reject();
      activeUserSignal = () => Promise.reject();
      updateGID = () => Promise.reject();

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
    const performNewInstall = async (date = today) => {
      // Pretend today is `date`.
      setCurrentDate(date);

      const demographics = 'demographics';
      newInstall = () => Promise.resolve(demographics);
      await gidManager.handleNewInstall();

      // Reset default value of current date.
      resetCurrentDate();

      return demographics;
    };

    describe('#handleNewInstall', () => {
      it('succeeds if server returns answer', async () => {
        const demographics = await performNewInstall();

        chai.expect(await gidManager.getGID()).to.be.eql(demographics);
        chai.expect(getState()).to.be.eql({
          anolysisDemographics: demographics,
          anolysisInstalled: today,
          anolysisLastAliveSignal: today,
          anolysisSentNewInstall: today,
        });
      });

      it('fails if server query fails', async () => {
        newInstall = () => Promise.reject();

        await gidManager.handleNewInstall();
        chai.expect(await gidManager.getGID()).to.be.eql('');
        chai.expect(getState()).to.be.eql({
          anolysisInstalled: today,
        });
      });
    });

    describe('#handleReappearingUser', () => {
      it('succeeds if server returns answer', async () => {
        const demographics = 'demographics';
        reappearingUser = () => Promise.resolve(demographics);

        await gidManager.handleReappearingUser();
        chai.expect(getState()).to.be.eql({
          anolysisDemographics: demographics,
          anolysisLastAliveSignal: today,
          anolysisSentNewInstall: today,
        });
      });

      it('fails if server query fails', async () => {
        reappearingUser = () => Promise.reject();

        await gidManager.handleReappearingUser();
        chai.expect(getState()).to.be.eql({});
      });
    });

    describe('#handleUpdate', () => {
      it('succeeds if server returns answer', async () => {
        const gid = 'gid';
        updateGID = () => Promise.resolve(gid);

        const demographics = await performNewInstall(yesterday);

        await gidManager.handleUpdate();
        chai.expect(await gidManager.getGID()).to.be.eql(gid);
        chai.expect(getState()).to.be.eql({
          // From getGID
          anolysisInstalled: today,

          // From handleUpdate
          anolysisGID: gid,
          anolysisLastGIDUpdate: today,

          // From handleNewInstall
          anolysisDemographics: demographics,
          anolysisLastAliveSignal: yesterday,
          anolysisSentNewInstall: yesterday,
        });
      });

      it('succeeds even if server query fails', async () => {
        // The rational being that the user will then just be marked unsafe and
        // will use '' as a GID (empty GID). This update can be tried again
        // later.
        updateGID = () => Promise.reject();

        const demographics = await performNewInstall(yesterday);

        await gidManager.handleUpdate();
        chai.expect(await gidManager.getGID()).to.be.eql('');
        chai.expect(getState()).to.be.eql({
          // From getGID
          anolysisInstalled: today,

          // From handleNewInstall
          anolysisDemographics: demographics,
          anolysisLastAliveSignal: yesterday,
          anolysisSentNewInstall: yesterday,
        });
      });
    });

    describe('#handleActiveUserSignal', () => {
      // Simulate a new available demographics
      const newDemographics = { new: 42 };
      const newDemographicsSerialized = JSON.stringify(newDemographics);

      const updateDemographics = () => {
        gidManager.demographics = newDemographics;
        gidManager.serializedDemographics = newDemographicsSerialized;
      };

      it('does not update granular demographics if < 6 months', async () => {
        await performNewInstall(yesterday);
        activeUserSignal = sinon.spy(() => Promise.resolve(newDemographics));
        updateDemographics();

        // Call handleActiveUserSignal (nothing should happen)
        const stateBefore = getState();
        await gidManager.handleActiveUserSignal('demographics');
        const stateAfter = getState();

        chai.expect(stateBefore).to.be.eql(stateAfter);
        chai.expect(activeUserSignal).to.not.have.been.called;
      });

      it('update granular demographics if >= 6 months', async () => {
        await performNewInstall(sixMonthsAgo);
        activeUserSignal = sinon.spy(() => Promise.resolve(newDemographicsSerialized));
        updateDemographics();

        // Call handleActiveUserSignal
        await gidManager.handleActiveUserSignal();
        chai.expect(activeUserSignal).to.have.been.calledOnce;
        chai.expect(getState()).to.be.eql({
          anolysisLastAliveSignal: today,
          anolysisDemographics: newDemographicsSerialized,
          anolysisSentNewInstall: sixMonthsAgo,
        });
      });
    });

    describe('#getGID', () => {
      it('resolves to the same promise if called several times', async () => {
        // Mock `_getGID` to make sure it's called only once.
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

      const fromNewInstall = 'demographicsNewInstall';
      const fromReappearingUser = 'demographicsReappearingUser';
      const fromActiveUser = 'demographicsActiveUser';
      const fromUpdateGID = 'gid';

      it('updates GID if needed', async () => {
        newInstall = sinon.spy(() => Promise.resolve(fromNewInstall));
        reappearingUser = sinon.spy(() => Promise.resolve(fromReappearingUser));
        activeUserSignal = sinon.spy(() => Promise.resolve(fromActiveUser));
        updateGID = sinon.spy(() => Promise.resolve(fromUpdateGID));

        // Mock install date of the browser/extension using: demographics.install_date
        gidManager.demographics = { install_date: '2016-01-01' };
        gidManager.serializedDemographics = JSON.stringify(gidManager.demographics);

        // New install
        setCurrentDate('2016-01-01');
        await gidManager.getGID();
        chai.expect(newInstall).to.have.been.calledOnce;
        chai.expect(updateGID).to.not.have.been.called;

        // Get GID
        setCurrentDate('2016-01-02');
        chai.expect(await gidManager.getGID()).to.be.eql(fromUpdateGID);
        chai.expect(newInstall).to.have.been.calledOnce;
        chai.expect(updateGID).to.have.been.calledOnce;

        // Get GID should trigger update
        setCurrentDate('2016-01-03');
        updateGID = sinon.spy(() => Promise.resolve('gid2'));
        chai.expect(await gidManager.getGID()).to.be.eql('gid2');
        chai.expect(newInstall).to.have.been.calledOnce;
        chai.expect(updateGID).to.have.been.calledOnce;

        // Calling again on same day should not change anything
        const state = getState();
        chai.expect(await gidManager.getGID()).to.be.eql('gid2');
        chai.expect(newInstall).to.have.been.calledOnce;
        chai.expect(updateGID).to.have.been.calledOnce;
        chai.expect(getState()).to.be.eql(state);

        // Next day, GID server fails to answer, we expect GID to stay the same.
        // It will be retried later. In the meanwhile, the user keeps reporting
        // with its current group.
        setCurrentDate('2016-01-04');
        updateGID = sinon.spy(() => Promise.reject());
        chai.expect(await gidManager.getGID()).to.be.eql('gid2');
      });

      // Define test-cases declaratively:
      [
        {
          browserInstallDate: today,
          anolysisInstallDate: today,
          gidResult: fromNewInstall,
          calls: {
            newInstall: 1,
          },
        },
        {
          browserInstallDate: yesterday,
          anolysisInstallDate: yesterday,
          gidResult: fromNewInstall,
          calls: {
            newInstall: 1,
          },
        },
        {
          browserInstallDate: yesterday,
          anolysisInstallDate: today,
          gidResult: fromReappearingUser,
          calls: {
            reappearingUser: 1,
          },
        },
        {
          browserInstallDate: sixMonthsAgo,
          anolysisInstallDate: yesterday,
          gidResult: fromReappearingUser,
          calls: {
            reappearingUser: 1,
          },
        },
        {
          browserInstallDate: sixMonthsAgo,
          anolysisInstallDate: sixMonthsAgo,
          currentDate: today,
          gidResult: fromUpdateGID,
          calls: {
            newInstall: 1,
            updateGID: 1,
            activeUserSignal: 1,
          },
        },
        {
          browserInstallDate: yesterday,
          anolysisInstallDate: yesterday,
          currentDate: today,
          gidResult: fromUpdateGID,
          calls: {
            newInstall: 1,
            updateGID: 1,
          },
        },
        {
          browserInstallDate: yesterday,
          anolysisInstallDate: yesterday,
          currentDate: today,
          gidResult: '',
          apis: {
            updateGID: false,
          },
          calls: {
            newInstall: 1,
            updateGID: 2,
          },
        },
      ].forEach((testCase) => {
        const { browserInstallDate, anolysisInstallDate, currentDate, gidResult, calls, apis } = {
          // Defaults
          apis: {},
          calls: {},

          ...testCase,
        };
        it(`succeeds for: ${JSON.stringify(testCase)}`, async () => {
          newInstall = sinon.spy(() => (
            apis.newInstall !== false
              ? Promise.resolve(fromNewInstall)
              : Promise.reject()
          ));
          reappearingUser = sinon.spy(() => (
            apis.reappearingUser !== false
              ? Promise.resolve(fromReappearingUser)
              : Promise.reject()
          ));
          activeUserSignal = sinon.spy(() => (
            apis.activeUserSignal !== false
              ? Promise.resolve(fromActiveUser)
              : Promise.reject()
          ));
          updateGID = sinon.spy(() => (
            apis.updateGID !== false
              ? Promise.resolve(fromUpdateGID)
              : Promise.reject()
          ));

          // Mock install date of the browser/extension using: demographics.install_date
          gidManager.demographics = { install_date: browserInstallDate };
          gidManager.serializedDemographics = JSON.stringify(gidManager.demographics);

          setCurrentDate(anolysisInstallDate);
          let gid = await gidManager.getGID();

          if (currentDate && currentDate !== anolysisInstallDate) {
            setCurrentDate(currentDate);
            gid = await gidManager.getGID();
          }

          // calling `getGID` two times in a raw should return the same result
          // if we are still on the same day.
          chai.expect(await gidManager.getGID()).to.be.eql(gid);

          chai.expect(gid).to.be.eql(gidResult);

          if (calls.newInstall !== undefined) {
            chai.expect(newInstall).to.have.been.callCount(calls.newInstall);
          } else {
            chai.expect(newInstall).to.not.have.been.called;
          }

          if (calls.reappearingUser !== undefined) {
            chai.expect(reappearingUser).to.have.been.callCount(calls.reappearingUser);
          } else {
            chai.expect(reappearingUser).to.not.have.been.called;
          }

          if (calls.updateGID !== undefined) {
            chai.expect(updateGID).to.have.been.callCount(calls.updateGID);
          } else {
            chai.expect(updateGID).to.not.have.been.called;
          }

          if (calls.activeUserSignal !== undefined) {
            chai.expect(activeUserSignal).to.have.been.callCount(calls.activeUserSignal);
          } else {
            chai.expect(activeUserSignal).to.not.have.been.called;
          }
        });
      });
    });
  },
);
