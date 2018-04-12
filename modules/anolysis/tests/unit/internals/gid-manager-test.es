/* global chai */
/* global sinon */
/* global describeModule */


const mockDexie = require('../../../core/unit/utils/dexie');
const moment = require('moment');

const CURRENT_DATE = '2017-01-02';
const DATE_FORMAT = 'YYYY-MM-DD';
const getCurrentMoment = () => moment(CURRENT_DATE, DATE_FORMAT);


let reappearingUser = () => {};
let newInstall = () => {};
let activeUserSignal = () => {};
let updateGID = () => {};


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
    'core/cliqz': {
      utils: {
        setInterval() {},
        setTimeout(cb) { cb(); },
      },
    },
    'core/console': { default: {} },
    'anolysis/internals/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
    'anolysis/internals/backend-communication': {
      default: BACKEND_MOCK,
    },
    'anolysis/internals/synchronized-date': {
      DATE_FORMAT,
      default() {
        return getCurrentMoment();
      },
    },
  }),
  () => {
    let storage;
    let gidManager;

    function setStorage(state) {
      return Promise.all(
        Object.keys(state).map(key => storage.gid.set(key, state[key]))
      );
    }

    function getStorage() {
      const state = {};
      storage.gid.entries().forEach(({ key, value }) => {
        state[key] = value;
      });
      return state;
    }

    beforeEach(function () {
      const GIDManager = this.module().default;
      mockDemographics = () => ({});

      const config = new Map();
      config.set('demographics', mockDemographics());
      gidManager = new GIDManager(config);

      return this.system.import('anolysis/internals/storage/dexie')
        .then((module) => {
          const Storage = module.default;
          storage = new Storage();
          return storage.init();
        })
        .then(() => gidManager.init(storage.gid));
    });

    afterEach(() => storage.destroy());

    describe('#handleNewInstall', () => {
      it('succeeds if server returns answer', () => {
        newInstall = () => Promise.resolve('demographics');

        return gidManager.handleNewInstall('test')
          .then(formatted => chai.expect(formatted).to.be.equal('demographics'))
          .then(() => getStorage())
          .then(state => chai.expect(state).to.be.eql({
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics',
            anolysisSentNewInstall: CURRENT_DATE,
          }));
      });

      it('fails if server query fails', () => {
        newInstall = () => Promise.reject();

        return gidManager.handleNewInstall('test')
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => getStorage())
          .then(state => chai.expect(state).to.be.eql({}));
      });
    });

    describe('#handleReappearingUser', () => {
      it('succeeds if server returns answer', () => {
        reappearingUser = () => Promise.resolve('demographics');

        return gidManager.handleReappearingUser('test')
          .then(formatted => chai.expect(formatted).to.be.equal('demographics'))
          .then(() => getStorage())
          .then(state => chai.expect(state).to.be.eql({
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics',
            anolysisSentNewInstall: CURRENT_DATE,
          }));
      });

      it('fails if server query fails', () => {
        reappearingUser = () => Promise.reject();

        return gidManager.handleReappearingUser('test')
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => getStorage())
          .then(state => chai.expect(state).to.be.eql({}));
      });
    });


    describe('#handleUpdate', () => {
      it('succeeds if backend returns a result', () => {
        updateGID = () => Promise.resolve('gid');

        return gidManager.handleUpdate('test')
          .then(gid => chai.expect(gid).to.be.equal('gid'))
          .then(() => getStorage())
          .then(state => chai.expect(state).to.be.eql({
            anolysisLastGIDUpdate: CURRENT_DATE,
            anolysisGID: 'gid',
          }));
      });

      it('succeeds even if backend fails', () => {
        // The rational being that the user will then just be marked unsafe and
        // will use '' as a GID (empty GID). This update can be tried again
        // later.
        updateGID = () => Promise.reject();

        return gidManager.handleUpdate('test')
          .then(gid => chai.expect(gid).to.be.equal(undefined))
          .then(() => getStorage())
          .then(state => chai.expect(state).to.be.eql({}));
      });
    });

    describe('#handleActiveUserSignal', () => {
      it('update granular demographics after 6 months', () => {
        // Simulate a new available demographics
        const newDemographics = JSON.stringify({ new: 42 });
        activeUserSignal = sinon.spy(() => Promise.resolve(newDemographics));

        // Simulate install for 6 months before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(6, 'month').format(DATE_FORMAT);
        const state = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisLastGIDUpdate: installDate,
          anolysisGID: 'gid',
          anolysisLatestDemographics: newDemographics,
        };

        return setStorage(state)
          .then(() => gidManager.handleActiveUserSignal('demographics'))
          .then(gid => chai.expect(gid).to.be.equal(newDemographics))
          .then(() => chai.expect(activeUserSignal).to.have.been.calledOnce)
          .then(() => getStorage())
          .then(state2 => chai.expect(state2).to.be.eql({
            anolysisInstalled: installDate,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: newDemographics,
            anolysisLastGIDUpdate: installDate,
            anolysisGID: 'gid',
            anolysisLatestDemographics: newDemographics,
          }));
      });
    });

    describe('#getGID', () => {
      it('resolves to the same promise if called several times', () => {
        // Mock `registerDemographicsFirstTime` to make sure
        // it's called only once.
        const registerDemographicsFirstTime = sinon.spy(
          gidManager.registerDemographicsFirstTime.bind(gidManager),
        );
        gidManager.registerDemographicsFirstTime = registerDemographicsFirstTime;

        // Several calls to `init` or `getGID` actually resolve to the same
        // promise. So that we cannot have several concurrent calls to this
        // same function.
        gidManager.updateState();
        gidManager.updateState();
        gidManager.updateState();
        gidManager.getGID();
        gidManager.getGID();
        gidManager.getGID();
        return gidManager.getGID()
          .then(() => chai.expect(registerDemographicsFirstTime).to.have.been.calledOnce);
      });

      it('returns granular demographics on new install', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics1'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics2'));
        updateGID = sinon.spy(() => Promise.resolve('gid'));

        storage.anolysisDemographics = JSON.stringify({
          install_date: CURRENT_DATE,
        });

        // Simulate install for the current day
        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal('demographics1'))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.have.been.calledOnce)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.not.have.been.called)
          .then(() => getStorage())
          .then(state => chai.expect(state).to.be.eql({
            anolysisSentNewInstall: CURRENT_DATE,
            anolysisInstalled: CURRENT_DATE,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics1',
            anolysisLatestDemographics: '{}',
          }));
      });

      it('returns granular demographics on reappearing user', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics1'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics2'));
        updateGID = sinon.spy(() => Promise.resolve('gid'));

        gidManager.setCurrentDemographics(JSON.stringify({
          install_date: getCurrentMoment().subtract(1, 'days').format(DATE_FORMAT),
        }));

        // Simulate install for the current day
        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal('demographics0'))
          .then(() => chai.expect(reappearingUser).to.have.been.calledOnce)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.not.have.been.called)
          .then(() => getStorage())
          .then(state => chai.expect(state).to.be.eql({
            anolysisInstalled: CURRENT_DATE,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics0',
            anolysisSentNewInstall: CURRENT_DATE,
            anolysisLatestDemographics: '{}',
          }));
      });

      it('returns granular demographics on first day', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.resolve('gid'));

        // Simulate install for the current day
        const demographics = JSON.stringify({
          install_date: getCurrentMoment().subtract(1, 'days').format(DATE_FORMAT),
        });

        const state = {
          anolysisInstalled: CURRENT_DATE,
          anolysisLastAliveSignal: CURRENT_DATE,
          anolysisSentNewInstall: CURRENT_DATE,
          anolysisDemographics: demographics,
          anolysisLatestDemographics: '{}',
        };

        return setStorage(state)
          .then(() => gidManager.getGID())
          .then(gid => chai.expect(gid).to.be.equal(demographics))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.not.have.been.called)
          .then(() => getStorage())
          .then(state2 => chai.expect(state2).to.be.eql({
            anolysisInstalled: CURRENT_DATE,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: demographics,
            anolysisSentNewInstall: CURRENT_DATE,
            anolysisLatestDemographics: '{}',
          }));
      });

      it('returns gid on second day', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.resolve('gid'));

        // Simulate install for the day before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(1, 'days').format(DATE_FORMAT);
        const state = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisSentNewInstall: installDate,
          anolysisLatestDemographics: '{}',
        };

        return setStorage(state)
          .then(() => gidManager.getGID())
          .then(gid => chai.expect(gid).to.be.equal('gid'))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.have.been.calledOnce)
          .then(() => getStorage())
          .then(state2 => chai.expect(state2).to.be.eql({
            anolysisInstalled: installDate,
            anolysisLastAliveSignal: installDate,
            anolysisDemographics: 'demographics',
            anolysisLastGIDUpdate: CURRENT_DATE,
            anolysisGID: 'gid',
            anolysisSentNewInstall: installDate,
            anolysisLatestDemographics: '{}',
          }));
      });

      it('returns empty GID if we could not update', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.reject());

        // Simulate install for the day before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(1, 'days').format(DATE_FORMAT);
        const state = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisSentNewInstall: installDate,
          anolysisLatestDemographics: '{}',
        };

        return setStorage(state)
          .then(() => gidManager.getGID())
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.have.been.calledOnce)
          .then(() => getStorage())
          .then(state2 => chai.expect(state2).to.be.eql(state));
      });

      it('returns gid if already available in storage', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.resolve('gid'));

        // Simulate install for the day before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(1, 'days').format(DATE_FORMAT);
        const state = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisLastGIDUpdate: installDate,
          anolysisGID: 'gid',
          anolysisSentNewInstall: installDate,
          anolysisLatestDemographics: '{}',
        };

        return setStorage(state)
          .then(() => gidManager.getGID())
          .then(gid => chai.expect(gid).to.be.equal('gid'))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.not.have.been.called)
          .then(() => getStorage())
          .then(state2 => chai.expect(state2).to.be.eql(state));
      });

      it('returns empty GID if out-dated GID is in pref (> 1 month old)', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.reject());

        // Simulate install for 6 months before before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(6, 'month').format(DATE_FORMAT);
        const state = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisLastGIDUpdate: installDate,
          anolysisGID: 'gid',
          anolysisSentNewInstall: installDate,
          anolysisLatestDemographics: '{}',
        };

        return setStorage(state)
          .then(() => gidManager.getGID())
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.have.been.calledOnce)
          .then(() => chai.expect(updateGID).to.have.been.calledOnce)
          .then(() => getStorage())
          .then(state2 => chai.expect(state2).to.be.eql({
            anolysisInstalled: installDate,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics',
            anolysisLastGIDUpdate: installDate,
            anolysisGID: 'gid',
            anolysisSentNewInstall: installDate,
            anolysisLatestDemographics: '{}',
          }));
      });

      it('returns updated GID if out-dated GID is in pref (> 1 month old)', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.resolve('updatedGID'));

        // Simulate install for 6 months before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(6, 'month').format(DATE_FORMAT);
        const state = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisLastGIDUpdate: installDate,
          anolysisSentNewInstall: installDate,
          anolysisGID: 'gid',
          anolysisLatestDemographics: '{}',
        };

        return setStorage(state)
          .then(() => gidManager.getGID())
          .then(gid => chai.expect(gid).to.be.equal('updatedGID'))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.have.been.calledOnce)
          .then(() => chai.expect(updateGID).to.have.been.calledOnce)
          .then(() => getStorage())
          .then(state2 => chai.expect(state2).to.be.eql({
            anolysisInstalled: installDate,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics',
            anolysisLastGIDUpdate: CURRENT_DATE,
            anolysisGID: 'updatedGID',
            anolysisSentNewInstall: installDate,
            anolysisLatestDemographics: '{}',
          }));
      });
    });
  },
);
