/* global chai */
/* global sinon */
/* global describeModule */


const moment = System._nodeRequire('moment');

const CURRENT_DATE = '2017-01-02';
const DATE_FORMAT = 'YYYY-MM-DD';
const getCurrentMoment = () => moment(CURRENT_DATE, DATE_FORMAT);


let reappearingUser = () => {};
let newInstall = () => {};
let activeUserSignal = () => {};
let updateGID = () => {};


const BACKEND_MOCK = {
  reappearingUser(demographics) { return reappearingUser(demographics); },
  newInstall(demographics) { return newInstall(demographics); },
  activeUserSignal(demographics) { return activeUserSignal(demographics); },
  updateGID(demographics) { return updateGID(demographics); },
};


export default describeModule('anolysis/gid-manager',
  () => ({
    'core/events': {
      default: {
        pub() {},
      },
    },
    'core/cliqz': {
      utils: {},
    },
    'anolysis/backend-communication': {
      default: BACKEND_MOCK,
    },
    'core/console': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
    'anolysis/synchronized-date': {
      DATE_FORMAT,
      default() {
        return getCurrentMoment();
      },
    },
    'platform/moment': {
      default(str, format) {
        if (str === undefined) {
          return getCurrentMoment();
        }

        return moment(str, format);
      },
    },
  }),
  () => {
    describe('#handleNewInstall', () => {
      let storage;
      let gidManager;

      beforeEach(function importNewInstall() {
        const GIDManager = new this.module().default;

        storage = {};
        gidManager = new GIDManager({
          put() { return Promise.resolve(); },
          getLastN() { return Promise.resolve([{ demographics: { a: 42 } }]); },
        }, {
          get(name) { return storage[name]; },
          set(name, value) { storage[name] = value; },
        });
      });

      it('succeeds if server returns answer', () => {
        newInstall = () => Promise.resolve('demographics');

        return gidManager.handleNewInstall('test')
          .then(formatted => chai.expect(formatted).to.be.equal('demographics'))
          .then(() => chai.expect(storage).to.be.eql({
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics',
            anolysisSentNewInstall: CURRENT_DATE,
          }));
      });

      it('fails if server query fails', () => {
        newInstall = () => Promise.reject();

        return gidManager.handleNewInstall('test')
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => chai.expect(storage).to.be.eql({}));
      });
    });

    describe('#handleReappearingUser', () => {
      let storage;
      let gidManager;

      beforeEach(function importReappearingUser() {
        const GIDManager = new this.module().default;

        storage = {};
        gidManager = new GIDManager({
          put() { return Promise.resolve(); },
          getLastN() { return Promise.resolve([{ demographics: { a: 42 } }]); },
        }, {
          get(name) { return storage[name]; },
          set(name, value) { storage[name] = value; },
        });
      });

      it('succeeds if server returns answer', () => {
        reappearingUser = () => Promise.resolve('demographics');

        return gidManager.handleReappearingUser('test')
          .then(formatted => chai.expect(formatted).to.be.equal('demographics'))
          .then(() => chai.expect(storage).to.be.eql({
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics',
            anolysisSentNewInstall: CURRENT_DATE,
          }));
      });

      it('fails if server query fails', () => {
        reappearingUser = () => Promise.reject();

        return gidManager.handleReappearingUser('test')
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => chai.expect(storage).to.be.eql({}));
      });
    });


    describe('#handleUpdate', () => {
      let storage;
      let gidManager;

      beforeEach(function importUpdate() {
        const GIDManager = new this.module().default;

        storage = {};
        gidManager = new GIDManager({
          put() { return Promise.resolve(); },
          getLastN() { return Promise.resolve([{ demographics: { a: 42 } }]); },
        }, {
          get(name) { return storage[name]; },
          set(name, value) { storage[name] = value; },
        });
      });

      it('succeeds if backend returns a result', () => {
        updateGID = () => Promise.resolve('gid');

        return gidManager.handleUpdate('test')
          .then(gid => chai.expect(gid).to.be.equal('gid'))
          .then(() => chai.expect(storage).to.be.eql({
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
          .then(() => chai.expect(storage).to.be.eql({}));
      });
    });

    describe('#handleActiveUserSignal', () => {
      let storage;
      let gidManager;

      beforeEach(function importNewInstall() {
        const GIDManager = new this.module().default;

        storage = {};
        gidManager = new GIDManager({
          put() { return Promise.resolve(); },
          getLastN() { return Promise.resolve([{ demographics: { a: 42 } }]); },
        }, {
          get(name) { return storage[name]; },
          set(name, value) { storage[name] = value; },
        });
      });

      it('update granular demographics on new month', () => {
        // Simulate a new available demographics
        const newDemographics = { new: 42 };
        const serializedNewDemographics = JSON.stringify(newDemographics);
        gidManager.demographicsStorage = {
          put() { return Promise.resolve(); },
          getLastN() { return Promise.resolve([{ demographics: newDemographics }]); },
        };

        activeUserSignal = sinon.spy(() => Promise.resolve(serializedNewDemographics));

        // Simulate install for the day before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(1, 'month').format(DATE_FORMAT);
        storage = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisLastGIDUpdate: installDate,
          anolysisGID: 'gid',
        };

        return gidManager.handleActiveUserSignal('demographics')
          .then(gid => chai.expect(gid).to.be.equal(serializedNewDemographics))
          .then(() => chai.expect(activeUserSignal).to.have.been.calledOnce)
          .then(() => chai.expect(storage).to.be.eql({
            anolysisInstalled: installDate,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: serializedNewDemographics,
            anolysisLastGIDUpdate: installDate,
            anolysisGID: 'gid',
          }));
      });
    });

    describe('#getGID', () => {
      let storage;
      let gidManager;

      beforeEach(function importNewInstall() {
        const GIDManager = new this.module().default;

        storage = {};
        gidManager = new GIDManager({
          put() { return Promise.resolve(); },
          getLastN() { return Promise.resolve([{ demographics: { a: 42 } }]); },
        }, {
          get(name) { return storage[name]; },
          set(name, value) { storage[name] = value; },
        });
      });

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
        gidManager.init();
        gidManager.init();
        gidManager.init();
        gidManager.getGID();
        gidManager.getGID();
        gidManager.getGID();
        return gidManager.getGID()
          .then(() => chai.expect(registerDemographicsFirstTime).to.have.been.calledOnce);
      });

      it('fails if no demographics available on first call', () => {
        newInstall = () => Promise.resolve();
        gidManager.demographicsStorage = {
          put() { return Promise.resolve(); },
          getLastN() { return Promise.resolve([]); },
        };

        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => chai.expect(storage).to.be.eql({}));
      });

      it('fails if call to storage fails on first call', () => {
        newInstall = () => Promise.resolve();
        gidManager.demographicsStorage = {
          put() { return Promise.resolve(); },
          getLastN() { return Promise.reject(); },
        };

        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => chai.expect(storage).to.be.eql({}));
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
          .then(() => chai.expect(storage).to.be.eql({
            anolysisSentNewInstall: CURRENT_DATE,
            anolysisInstalled: CURRENT_DATE,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics1',
          }));
      });

      it('returns granular demographics on reappearing user', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics1'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics2'));
        updateGID = sinon.spy(() => Promise.resolve('gid'));

        storage.anolysisDemographics = JSON.stringify({
          install_date: getCurrentMoment().subtract(1, 'days').format(DATE_FORMAT),
        });

        // Simulate install for the current day
        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal('demographics0'))
          .then(() => chai.expect(reappearingUser).to.have.been.calledOnce)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.not.have.been.called)
          .then(() => chai.expect(storage).to.be.eql({
            anolysisInstalled: CURRENT_DATE,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics0',
            anolysisSentNewInstall: CURRENT_DATE,
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

        storage = {
          anolysisInstalled: CURRENT_DATE,
          anolysisLastAliveSignal: CURRENT_DATE,
          anolysisSentNewInstall: CURRENT_DATE,
          anolysisDemographics: demographics,
        };

        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal(demographics))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.not.have.been.called)
          .then(() => chai.expect(storage).to.be.eql({
            anolysisInstalled: CURRENT_DATE,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: demographics,
            anolysisSentNewInstall: CURRENT_DATE,
          }));
      });

      it('returns gid on second day', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.resolve('gid'));

        // Simulate install for the day before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(1, 'days').format(DATE_FORMAT);
        storage = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisSentNewInstall: installDate,
        };

        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal('gid'))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.have.been.calledOnce)
          .then(() => chai.expect(storage).to.be.eql({
            anolysisInstalled: installDate,
            anolysisLastAliveSignal: installDate,
            anolysisDemographics: 'demographics',
            anolysisLastGIDUpdate: CURRENT_DATE,
            anolysisGID: 'gid',
            anolysisSentNewInstall: installDate,
          }));
      });

      it('returns empty GID if we could not update', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.reject());

        // Simulate install for the day before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(1, 'days').format(DATE_FORMAT);
        storage = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisSentNewInstall: installDate,
        };

        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.have.been.calledOnce)
          .then(() => chai.expect(storage).to.be.eql(storage));
      });

      it('returns gid if already available in storage', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.resolve('gid'));

        // Simulate install for the day before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(1, 'days').format(DATE_FORMAT);
        storage = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisLastGIDUpdate: installDate,
          anolysisGID: 'gid',
          anolysisSentNewInstall: installDate,
        };

        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal('gid'))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.not.have.been.called)
          .then(() => chai.expect(updateGID).to.not.have.been.called)
          .then(() => chai.expect(storage).to.be.eql(storage));
      });

      it('returns empty GID if out-dated GID is in pref (> 1 month old)', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.reject());

        // Simulate install for the day before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(1, 'month').format(DATE_FORMAT);
        storage = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisLastGIDUpdate: installDate,
          anolysisGID: 'gid',
          anolysisSentNewInstall: installDate,
        };

        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal(''))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.have.been.calledOnce)
          .then(() => chai.expect(updateGID).to.have.been.calledOnce)
          .then(() => chai.expect(storage).to.be.eql({
            anolysisInstalled: installDate,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics',
            anolysisLastGIDUpdate: installDate,
            anolysisGID: 'gid',
            anolysisSentNewInstall: installDate,
          }));
      });

      it('returns updated GID if out-dated GID is in pref (> 1 month old)', () => {
        reappearingUser = sinon.spy(() => Promise.resolve('demographics0'));
        newInstall = sinon.spy(() => Promise.resolve('demographics'));
        activeUserSignal = sinon.spy(() => Promise.resolve('demographics'));
        updateGID = sinon.spy(() => Promise.resolve('updatedGID'));

        // Simulate install for the day before
        const installDate = moment(CURRENT_DATE, DATE_FORMAT).subtract(1, 'month').format(DATE_FORMAT);
        storage = {
          anolysisInstalled: installDate,
          anolysisLastAliveSignal: installDate,
          anolysisDemographics: 'demographics',
          anolysisLastGIDUpdate: installDate,
          anolysisSentNewInstall: installDate,
          anolysisGID: 'gid',
        };

        return gidManager.getGID()
          .then(gid => chai.expect(gid).to.be.equal('updatedGID'))
          .then(() => chai.expect(reappearingUser).to.not.have.been.called)
          .then(() => chai.expect(newInstall).to.not.have.been.called)
          .then(() => chai.expect(activeUserSignal).to.have.been.calledOnce)
          .then(() => chai.expect(updateGID).to.have.been.calledOnce)
          .then(() => chai.expect(storage).to.be.eql({
            anolysisInstalled: installDate,
            anolysisLastAliveSignal: CURRENT_DATE,
            anolysisDemographics: 'demographics',
            anolysisLastGIDUpdate: CURRENT_DATE,
            anolysisGID: 'updatedGID',
            anolysisSentNewInstall: installDate,
          }));
      });
    });
  },
);
