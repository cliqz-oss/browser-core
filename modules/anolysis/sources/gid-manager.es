import { utils } from 'core/cliqz';
import Backend from 'anolysis/backend-communication';
import log from 'anolysis/logging';
import moment from 'platform/moment';


const CLIENT_STATE = {
  NEW_INSTALL: 0,
  FIRST_DAY: 1,
  SAFE: 2,
  SHOULD_UPDATE: 3,
  UNSAFE: 4,
};


const DATE_FORMAT = 'DD/MM/YYYY';


// Abstraction over storage in preferences
const PREF_STORAGE = {
  get: utils.getPref,
  set: utils.setPref,
};


const NEW_INSTALL_DATE_PREF = 'anolysisInstalled';
const LAST_TIME_SENT_PREF = 'anolysisLastAliveSignal';
const LAST_TIME_GID_UPDATE_PREF = 'anolysisLastGIDUpdate';
const CURRENT_SAFE_GID_PREF = 'anolysisGID';
const CURRENT_DEMOGRAPHICS_PREF = 'anolysisDemographics';


/**
 * Manage the date at which we last updated the GID.
 */
function setLastGIDUpdateDate(date) {
  PREF_STORAGE.set(LAST_TIME_GID_UPDATE_PREF, date);
}


function getLastGIDUpdateDate() {
  return PREF_STORAGE.get(LAST_TIME_GID_UPDATE_PREF);
}


/**
 * setter and getter to manage the granular combination of
 * demographics for the user.
 */
function setCurrentDemographics(demographics) {
  PREF_STORAGE.set(CURRENT_DEMOGRAPHICS_PREF, demographics);
}


function getCurrentDemographics() {
  return PREF_STORAGE.get(CURRENT_DEMOGRAPHICS_PREF);
}


/**
 * setter and getter to manage the safe group ID for the user.
 */
function setCurrentGID(gid) {
  PREF_STORAGE.set(CURRENT_SAFE_GID_PREF, gid);
}


function getCurrentGID() {
  return PREF_STORAGE.get(CURRENT_SAFE_GID_PREF);
}


/**
 * setter and getter to manage the timestamp of the 'new install' event for the user.
 * This can be either the first day the user installed Cliqz, or the day telemetry
 * without ID was enabled for the an existing user.
 */
function setNewInstallDate(date) {
  PREF_STORAGE.set(NEW_INSTALL_DATE_PREF, date);
}


function getNewInstallDate() {
  return PREF_STORAGE.get(NEW_INSTALL_DATE_PREF);
}


/**
 * setter and getter to manage the last time the granular combination of
 * demographics factors was sent to the backend.
 */
function setLastTimeDemographicSent(date) {
  PREF_STORAGE.set(LAST_TIME_SENT_PREF, date);
}


function getLastTimeDemographicSent() {
  return PREF_STORAGE.get(LAST_TIME_SENT_PREF);
}


/**
 * Given an ID (either granular demographics or GID) as a JSON, serialize
 * it to a String and make sure we can compare them (keys should be sorted).
 */
function serializeID(id) {
  return JSON.stringify(id);
}


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
  constructor(demographicsStorage) {
    this.demographicsStorage = demographicsStorage;
  }

  init() {
    log('gid manager init');
    return this.registerDemographicsFirstTime()
      .then(() => this.updateClientState())
      .then(() => this.handleActiveUserSignal())
      .catch(() => {
        // We currently don't have any demographics available, we need to
        // wait until a call to `updateDemographics` before proceeding.
        // TODO: Log here
      });
  }

  /**
   * Check if the user already has a granular combination of demographic
   * factors stored in prefs. If not, try to get it from storage. And if
   * none is present, then the user is set as UNSAFE, until one is present.
   */
  registerDemographicsFirstTime() {
    log('registerDemographicsFirstTime');
    if (getCurrentDemographics() === undefined) {
      // If it's the first time, it might be that there is no granular
      // demographic factors yet. Check if there is one in storage, if
      // yes, use the last one.
      log('try to get latest demographics from storage');
      return this.demographicsStorage.getLastN(1)
        .then((results) => {
          log(`registerDemographicsFirstTime results ${JSON.stringify(results)}`);
          if (results.length === 1) {
            log(`registerDemographicsFirstTime setCurrentDemographics ${JSON.stringify(results[0])}`);
            setCurrentDemographics(serializeID(results[0].demographics));
            return Promise.resolve();
          }

          // If no demographic factors are present in storage, the user is
          // unsafe, until the GID manager is updated with a new id.
          return Promise.reject();
        });
    }

    return Promise.resolve();
  }

  getCurrentState() {
    log('getCurrentState');
    // Get current date: DD/MM/YYYY
    const currentDate = moment();

    // If we did not register any install date yet,
    // it means that this is a new install.
    if (getNewInstallDate() === undefined) {
      // Only enter the NEW_INSTALL state if demographics are available
      if (getCurrentDemographics() !== undefined) {
        return CLIENT_STATE.NEW_INSTALL;
      }

      // Otherwise we are in an unsafe state
      return CLIENT_STATE.UNSAFE;
    }

    const installDate = moment(getNewInstallDate(), DATE_FORMAT);

    // If we are still the same day as the install date
    // then we are in the FIRST_DAY state.
    if (installDate.isSame(currentDate, 'day')) {
      return CLIENT_STATE.FIRST_DAY;
    }

    // If we are more than one day after the install
    // then we should query the backend to get our safe
    // GID.
    if (getCurrentGID() === undefined &&
        currentDate.isAfter(installDate, 'day')) {
      return CLIENT_STATE.SHOULD_UPDATE;
    }

    // If a GID is already present, check if it's not out-of-date.
    if (getLastGIDUpdateDate() !== undefined) {
      const gidUpdateDate = moment(getLastGIDUpdateDate(), DATE_FORMAT);

      // If we did not update the GID for the current month, then
      // we should query the backend again to check for update.
      if (!currentDate.isSame(gidUpdateDate, 'month')) {
        return CLIENT_STATE.SHOULD_UPDATE;
      }

      // If we have GID and it has been updated during the current month
      // then we are safe!
      if (getCurrentGID() !== undefined &&
          gidUpdateDate.isSame(currentDate, 'month')) {
        return CLIENT_STATE.SAFE;
      }
    }

    return CLIENT_STATE.UNSAFE;
  }

  updateClientState() {
    log(`update client state from ${this.getCurrentState()}`);
    switch (this.getCurrentState()) {
      case CLIENT_STATE.NEW_INSTALL:
        return this.handleNewInstall();
      case CLIENT_STATE.SHOULD_UPDATE:
        return this.handleUpdate();
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

  handleNewInstall() {
    log('handleNewInstall');
    return Backend.newInstall(getCurrentDemographics())
      .then(() => {
        log('Success handleNewInstall');
        setNewInstallDate(moment().format(DATE_FORMAT));
      })
      .catch((ex) => {
        // TODO: This could be a security problem for the user
        log(`Could not send newInstall signal ${ex} ${ex.stack}`);
      });
  }

  handleUpdate() {
    log('handleUpdate');
    return Backend.updateGID(getCurrentDemographics())
      .then((gid) => {
        log(`success handleUpdate ${gid}`);
        setLastGIDUpdateDate(moment().format(DATE_FORMAT));
        setCurrentGID(gid);
      })
      .catch(() => {
        // If we were not able to retrieve a valid GID, then the user
        // is marked as UNSAFE and won't send sensitive information.
      });
  }

  handleActiveUserSignal() {
    log('handleActiveUserSignal');
    // TODO: Right now all user will send this once a month (except
    // if it's the same month as the install date), but in the future
    // we might want to send it only with a given probability. eg: 75%.

    // Check if we should send the 'alive signal' along with
    // the most granular demographic factors.
    if (getLastTimeDemographicSent() !== undefined) {
      log('handleActiveUserSignal has already been sent before');
      // Get current date: DD/MM/YYYY
      const currentDate = moment();
      const lastDemographicSentDate = moment(getLastTimeDemographicSent(), DATE_FORMAT);

      if (currentDate.isAfter(lastDemographicSentDate, 'month')) {
        log('handleActiveUserSignal send again');
        return Backend.activeUserSignal(getCurrentDemographics())
          .then(() => {
            setLastTimeDemographicSent(currentDate.format(DATE_FORMAT));
          });
      }
    }

    return Promise.resolve();
  }

  /**
   * Handle new demographics for the user. This should not happen very often.
   */
  updateDemographics(demographics) {
    log(`updateDemographics ${JSON.stringify(demographics)}`);
    return this.demographicsStorage.put(demographics);
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
        log('init successful');
        switch (this.getCurrentState()) {
          case CLIENT_STATE.FIRST_DAY:
            return getCurrentDemographics();
          case CLIENT_STATE.SAFE:
            return getCurrentGID();
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
