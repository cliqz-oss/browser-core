import Backend from 'anolysis/backend-communication';
import log from 'anolysis/logging';
import moment from 'platform/moment';
import getSynchronizedDate, { DATE_FORMAT } from 'anolysis/synchronized-date';


const CLIENT_STATE = {
  NEW_INSTALL: 0,
  FIRST_DAY: 1,
  SAFE: 2,
  SHOULD_UPDATE: 3,
  UNSAFE: 4,
};


const NEW_INSTALL_DATE_PREF = 'anolysisInstalled';
const LAST_TIME_SENT_PREF = 'anolysisLastAliveSignal';
const LAST_TIME_GID_UPDATE_PREF = 'anolysisLastGIDUpdate';
const CURRENT_SAFE_GID_PREF = 'anolysisGID';
const CURRENT_DEMOGRAPHICS_PREF = 'anolysisDemographics';


/**
 * This class is in charge of managing the safe group id of the user.
 * At any point of time, the `getGID` method will be used to get the
 * most up-to-date version of the GID, included in signals that will
 * be sent to the backend.
 *
 * The user can be in several states:
 * 1. new install
 * 2. first day
 * 3. safe
 * 4. should update its GID
 * 5. unsafe
 *
 * The GID manager should make sure that in any of the possible states,
 * the correct course of action is choosen when we call the `getGID`.
 *
 * It should also be invoked when new demographics are available.
 *
 * This manager is also responsible for reporting, once a month, the granular
 * combination of factors once again, with a certain probability. This is to
 * ensure that the backend is able to keep track of active users (and forget
 * about non-active ones), while still preserving privacy (cf. paper for more
 * information on this mechanism).
 */
export default class {
  constructor(demographicsStorage, storage) {
    this.demographicsStorage = demographicsStorage;
    this.isReadyPromise = null;
    this.storage = storage;
  }

  /**
   * Init is a method what will perform the following actions:
   * 1. Check if granular demographics factors are available (prefs, pouchdb)
   * 2. Perform actions if needed: new install, update GID
   * 3. Check if alive signal should be sent (and send it if necessary)
   *
   * Moreover, the method is implemented in such a way that it cannot be called
   * two times concurrently. If `init` is called twice in a row, and the first
   * call did not resolve yet, then the second call will be ignored and will
   * return the promise created by the first call.
   */
  init() {
    if (this.isReadyPromise === null) {
      this.isReadyPromise = this.registerDemographicsFirstTime()
        .then(demographics => this.updateClientState(demographics).then(() => demographics))
        .then(demographics => this.handleActiveUserSignal(demographics))
        .catch(() => {
          // We currently don't have any demographics available, we need to
          // wait until a call to `updateDemographics` before proceeding.
          log('No valid GID available found');
        })
        .then(() => {
          // Delete reference as init is done.
          this.isReadyPromise = null;
        });
    }

    return this.isReadyPromise;
  }

  /**
   * Manage the date at which we last updated the GID.
   */
  setLastGIDUpdateDate(date) {
    this.storage.set(LAST_TIME_GID_UPDATE_PREF, date);
  }

  getLastGIDUpdateDate() {
    return this.storage.get(LAST_TIME_GID_UPDATE_PREF);
  }

  /**
   * setter and getter to manage the granular combination of
   * demographics for the user.
   */
  setCurrentDemographics(demographics) {
    this.storage.set(CURRENT_DEMOGRAPHICS_PREF, demographics);
  }

  getCurrentDemographics() {
    return this.storage.get(CURRENT_DEMOGRAPHICS_PREF);
  }

  /**
   * setter and getter to manage the safe group ID for the user.
   */
  setCurrentGID(gid) {
    this.storage.set(CURRENT_SAFE_GID_PREF, gid);
  }

  getCurrentGID() {
    return this.storage.get(CURRENT_SAFE_GID_PREF);
  }

  /**
   * setter and getter to manage the timestamp of the 'new install' event for the user.
   * This can be either the first day the user installed Cliqz, or the day telemetry
   * without ID was enabled for the an existing user.
   */
  setNewInstallDate(date) {
    this.storage.set(NEW_INSTALL_DATE_PREF, date);
  }

  getNewInstallDate() {
    return this.storage.get(NEW_INSTALL_DATE_PREF);
  }

  /**
   * setter and getter to manage the last time the granular combination of
   * demographics factors was sent to the backend.
   */
  setLastTimeDemographicSent(date) {
    this.storage.set(LAST_TIME_SENT_PREF, date);
  }

  getLastTimeDemographicSent() {
    return this.storage.get(LAST_TIME_SENT_PREF);
  }

  /**
   * Check if the user already has a granular combination of demographic
   * factors stored in prefs. If not, try to get it from storage. And if
   * none is present, then the user is set as UNSAFE, until one is present.
   */
  registerDemographicsFirstTime() {
    const currentDemographics = this.getCurrentDemographics();
    if (currentDemographics === undefined) {
      // If it's the first time, it might be that there is no granular
      // demographic factors yet. Check if there is one in storage, if
      // yes, use the last one.
      log('try to get latest demographics from storage');
      return this.demographicsStorage.getLastN(1)
        .then((results) => {
          log(`registerDemographicsFirstTime results ${JSON.stringify(results)}`);
          if (results.length === 1) {
            const newDemographics = JSON.stringify(results[0].demographics);
            log(`registerDemographicsFirstTime returns ${newDemographics}`);
            return Promise.resolve(newDemographics);
          }

          // If no demographic factors are present in storage, the user is
          // unsafe, until the GID manager is updated with a new id.
          return Promise.reject();
        });
    }

    return Promise.resolve(currentDemographics);
  }

  currentState() {
    const currentDate = getSynchronizedDate();
    const installDateFormatted = this.getNewInstallDate();

    // If we did not register any install date yet,
    // it means that this is a new install.
    if (installDateFormatted === undefined) {
      return CLIENT_STATE.NEW_INSTALL;
    }

    const installDate = moment(this.getNewInstallDate(), DATE_FORMAT);

    // If we are still the same day as the install date
    // then we are in the FIRST_DAY state.
    if (installDate.isSame(currentDate, 'day')) {
      return CLIENT_STATE.FIRST_DAY;
    }

    // If we are more than one day after the install
    // then we should query the backend to get our safe
    // GID.
    if (this.getCurrentGID() === undefined &&
        currentDate.isAfter(installDate, 'day')) {
      return CLIENT_STATE.SHOULD_UPDATE;
    }

    // If a GID is already present, check if it's not out-of-date.
    if (this.getLastGIDUpdateDate() !== undefined) {
      const gidUpdateDate = moment(this.getLastGIDUpdateDate(), DATE_FORMAT);

      // If we did not update the GID for the current month, then
      // we should query the backend again to check for update.
      if (!currentDate.isSame(gidUpdateDate, 'month')) {
        return CLIENT_STATE.SHOULD_UPDATE;
      }

      // If we have GID and it has been updated during the current month
      // then we are safe!
      if (this.getCurrentGID() !== undefined &&
          gidUpdateDate.isSame(currentDate, 'month')) {
        return CLIENT_STATE.SAFE;
      }
    }

    return CLIENT_STATE.UNSAFE;
  }

  updateClientState(demographics) {
    log(`update client state from ${this.currentState()} ${demographics}`);
    switch (this.currentState()) {
      case CLIENT_STATE.NEW_INSTALL:
        return this.handleNewInstall(demographics);
      case CLIENT_STATE.SHOULD_UPDATE:
        return this.handleUpdate(demographics);
      case CLIENT_STATE.SAFE:
      case CLIENT_STATE.FIRST_DAY:
      case CLIENT_STATE.UNSAFE:
        // Nothing should be done
        break;
      default:
        // Should never happen
        break;
    }

    return Promise.resolve();
  }

  // --------------------------------------------------------------------------
  // Handle state transition:
  // * handleNewInstall
  // * handleUpdate
  // * handleActiveSignal
  // --------------------------------------------------------------------------

  handleNewInstall(demographics) {
    log('handleNewInstall');
    return Backend.newInstall(demographics)
      .then((formattedDemographics) => {
        log('Success handleNewInstall');
        const currentDate = getSynchronizedDate().format(DATE_FORMAT);

        this.setLastTimeDemographicSent(currentDate);
        this.setNewInstallDate(currentDate);
        this.setCurrentDemographics(formattedDemographics);

        return formattedDemographics;
      })
      .catch((ex) => {
        // TODO: This could be a security problem for the user
        log(`Could not send newInstall signal ${ex}`);

        return '';
      });
  }

  handleUpdate(demographics) {
    log('handleUpdate');
    return Backend.updateGID(demographics)
      .then((gid) => {
        log(`success handleUpdate ${gid}`);
        this.setLastGIDUpdateDate(getSynchronizedDate().format(DATE_FORMAT));
        this.setCurrentGID(gid);

        return gid;
      })
      .catch(() => {
        // If we were not able to retrieve a valid GID, then the user
        // is marked as UNSAFE and won't send sensitive information.
      });
  }

  handleActiveUserSignal(demographics) {
    // TODO: Right now all user will send this once a month (except
    // if it's the same month as the install date), but in the future
    // we might want to send it only with a given probability. eg: 75%.

    // Check if we should send the 'alive signal' along with
    // the most granular demographic factors.
    const lastTimeDemographicsSent = this.getLastTimeDemographicSent();
    if (lastTimeDemographicsSent !== undefined) {
      log('handleActiveUserSignal has already been sent before');

      const currentDate = getSynchronizedDate();
      const lastDemographicSentDate = moment(lastTimeDemographicsSent, DATE_FORMAT);

      if (currentDate.isAfter(lastDemographicSentDate, 'month')) {
        log('handleActiveUserSignal send again');
        // Get latest demographics available in storage
        return this.demographicsStorage.getLastN(1)
          .then((results) => {
            if (results.length === 1) {
              return JSON.stringify(results[0].demographics);
            }

            return Promise.reject();
          })
          .catch(() => demographics)
          .then(newDemographics => Backend.activeUserSignal(newDemographics))
          .then((formattedDemographics) => {
            this.setCurrentDemographics(formattedDemographics);
            this.setLastTimeDemographicSent(currentDate.format(DATE_FORMAT));
            return formattedDemographics;
          });
      }
    }

    // The demographics have already been sent before
    return Promise.resolve(demographics);
  }

  /**
   * Handle new demographics for the user. This should not happen very often.
   */
  updateDemographics(demographics) {
    log(`updateDemographics ${JSON.stringify(demographics)}`);
    return this.demographicsStorage.put(demographics)
      .then(() => this.init());
  }

  /**
   * Returns the GID with which the user should report to
   * the backend.
   *
   * On the first day after installation, this will be the granular
   * combination of demographics.
   *
   * On subsequent days, this will be a safe group ID returned by
   * the back-end.
   */
  getGID() {
    log('getGID');
    return this.init()
      .then(() => {
        switch (this.currentState()) {
          case CLIENT_STATE.FIRST_DAY:
            return this.getCurrentDemographics();
          case CLIENT_STATE.SAFE:
            return this.getCurrentGID();
          case CLIENT_STATE.NEW_INSTALL:
          case CLIENT_STATE.SHOULD_UPDATE:
          case CLIENT_STATE.UNSAFE:
            break;
          default:
            break;
        }

        // Any state which is not FIRST_DAY or SAFE, should not
        // report with any ID that could be unsafe for the user.
        return '';
      })
      .catch((ex) => {
        log(`Exception ${ex} ${ex.stack}`);
      });
  }
}
