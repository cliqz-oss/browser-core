import moment from '../../platform/lib/moment';
import inject from '../../core/kord/inject';

import Backend from './backend-communication';
import getSynchronizedDate, { getSynchronizedDateFormatted, DATE_FORMAT } from './synchronized-date';
import logger from './logger';

// Keys used in storage to keep track of Anolysis' state.
const GID = 'anolysisGID';
const LAST_DEMOGRAPHICS_SENT_DATE = 'anolysisLastAliveSignal';
const LAST_GID_UPDATE_DATE = 'anolysisLastGIDUpdate';
const NEW_INSTALL_DATE = 'anolysisInstalled';
const NORMALIZED_DEMOGRAPHICS = 'anolysisDemographics';
const RAW_DEMOGRAPHICS = 'anolysisRawDemographics';


/**
 * Check if two sets of demographics (objects) are equal. This means that:
 * 1. They have the same keys
 * 2. They have the same values for every keys
 */
function demographicsEqual(demographics1, demographics2) {
  const keys1 = Object.keys(demographics1).sort();
  const keys2 = Object.keys(demographics2).sort();
  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let i = 0; i < keys1.length; i += 1) {
    // Check names of keys are the same
    if (keys1[i] !== keys2[i]) {
      return false;
    }

    // Check values are the same
    if (demographics1[keys1[i]] !== demographics2[keys2[i]]) {
      return false;
    }
  }

  return true;
}

/**
 * This class is in charge of managing the safe group id of the user. At any
 * point of time, the `getGID` method can be used to get the most up-to-date
 * version of the GID, which will be included in signals that will be sent to
 * the backend.
 *
 * There are a few edge cases which need to be checked when deciding how to
 * report demographics alongside behavioral signals:
 * 1. On first day after installation, the user will report signals using the
 *    granular demographics to the backend. This is needed because we only
 *    compute safe groups once per day and cannot assign each new user to a
 *    group immediately. This is also safe, because it's the only time any user
 *    will report behavioral information with granular demographics information.
 * 2. After first day, eash user is assigned to a safe group and will only
 *    report using the group ID (a.k.a. 'GID') in the future.
 *
 * The GID manager will make sure that in any of the possible states, the
 * correct course of action is choosen when we call the `getGID`. In this
 * regard, the way it works is not by storing the state explicitly in memory,
 * but instead checking the state (did we send demogaphics yet, did we update
 * demographics, do we need a GID, etc.) and deciding on the correct actions to
 * perform based on that.
 *
 * Last but not least, the GID will be updated regularly to keep users, while
 * preserving as much granularity as possible in the demographics identifying
 * each group.
 */
export default class GidManager {
  constructor(config) {
    // Used to communicate with our backend
    this.backend = new Backend(config);
    this.storage = null;

    // Granular demographics are available through Anolysis' config.
    this.demographics = config.get('demographics');

    // This can hold a referrence to the result of `getGID` if we attempt
    // several concurrent calls to this method.
    this.getGIDPromise = null;
  }

  init(storage) {
    // Get a reference to GID storage
    this.storage = storage;
  }

  /**
   * Manage the date at which we last updated the GID (i.e.: called the
   * /update_gid endpoint of the backend).
   */
  setLastGIDUpdateDate(date) {
    return this.storage.set(LAST_GID_UPDATE_DATE, date);
  }

  getLastGIDUpdateDate() {
    return this.storage.get(LAST_GID_UPDATE_DATE);
  }

  /**
   * Accessors used to keep track of the last normalized version of the
   * demographics returned by the backend (`/send_demographics` endpoint). This
   * normalized string is used to negociate a new GID with the backend when
   * needed.
   *
   * A note about normalized demographics: the GID update procedure allows a
   * client to know its latest group without communicating its granular
   * demographics to the backend again (read comments in backend-communication.es
   * for more detail about this method). This requires the serialized version of
   * demographics (as a string) to be identical to the version known to the
   * backend. To achieve this, when a client sends demographics using
   * `/send_demographics`, the server will return back a serialized and
   * normalized version of the same demographics (this property is checked by
   * the client to make sure the backend cannot inject arbitrary values and
   * track the user). This normalized version is then persisted in the client,
   * and used whenever an update of the group is required.
   */
  setRegisteredDemographics(demographics) {
    return this.storage.set(NORMALIZED_DEMOGRAPHICS, demographics);
  }

  getRegisteredDemographics() {
    return this.storage.get(NORMALIZED_DEMOGRAPHICS);
  }

  /**
   * Accessors used to keep track of the last demographics sent to backend , in
   * they *raw form* (but stringified); that is, before normalization by the
   * backend. This is used to detect locally when demographics of a user change.
   */
  setLastRawDemographics(demographics) {
    return this.storage.set(RAW_DEMOGRAPHICS, demographics);
  }

  getLastRawDemographics() {
    return this.storage.get(RAW_DEMOGRAPHICS);
  }

  /**
   * Accessors used to keep track of the current GID (group identifier).
   */
  setCurrentGID(gid) {
    return this.storage.set(GID, gid);
  }

  getCurrentGID() {
    return this.storage.get(GID);
  }

  /**
   * Accessors used to keep track of the install date of Anolysis. This does not
   * always have the same value as `install_date` from pref. Indeed, it is set
   * the first time Anolysis module is started. This is used in two cases:
   * 1. To detect when `getGID` is called the same day as installation to send
   * granular demographics instead of trying to get a safe group from the
   * backend.
   * 2. To not try to generated aggregated analyses for days before the first
   * day Anolysis started (where there would not be any metrics to aggregate
   * anyway).
   */
  setNewInstallDate(date) {
    return this.storage.set(NEW_INSTALL_DATE, date);
  }

  getNewInstallDate() {
    return this.storage.get(NEW_INSTALL_DATE);
  }

  /**
   * Accessors used to keep track of the last time granular demographics were
   * communicated to the backend. This information needs to be communicated to
   * the backend whenever granular demographics are sent again, so that we can
   * do some book-keeping and make sure we know exactly how many users we have
   * at any point in time.
   */
  setLastTimeDemographicSent(date) {
    return this.storage.set(LAST_DEMOGRAPHICS_SENT_DATE, date);
  }

  getLastTimeDemographicSent() {
    return this.storage.get(LAST_DEMOGRAPHICS_SENT_DATE);
  }

  /**
   * Check if demogaphics changed since last time they were sent to backend.
   */
  demographicsChanged() {
    if (this.getLastRawDemographics() !== undefined) {
      // Compare the current granular demographics (`this.demographics`) to the
      // demographics previously sent to backend (`this.getLastRawDemographics()`).
      return !demographicsEqual(
        this.demographics,
        JSON.parse(this.getLastRawDemographics()),
      );
    }

    return true;
  }

  /**
   * Send granular demographics to the backend *if needed*. Sending is needed
   * only if the current granular demographics are different from the previously
   * sent demographics (which is also the case when we never sent them before:
   * on new install).
   */
  async handleSendDemographics() {
    logger.debug('handleSendDemographics');
    try {
      // Granular demographics will be sent at least once per day
      const lastTimeDemographicsSent = moment(this.getLastTimeDemographicSent(), DATE_FORMAT);
      const currentDate = getSynchronizedDate();
      if (!this.demographicsChanged() && lastTimeDemographicsSent.isSame(currentDate, 'day')) {
        logger.debug('Demographics were already sent');
        return;
      }

      const formattedDemographics = await this.backend.sendDemographics({
        // We send the current version of the demographics to the backend
        demographics: this.demographics,

        // Optionally, if we already sent granular demographics before, we also
        // send the normalized version returned by the backend along. This
        // allows the backend to do some book-keeping and keep track of the real
        // size of user population.
        previousDemographics: (
          (
            // This is what will be sent to the backend (normalized demographics
            // returned by the GID server).
            this.getRegisteredDemographics() !== undefined

            // We also check if `getLastRawDemographics()` is set. The rational
            // is this: during the migration to the new unified `send_demographics`
            // endpoint, some users will update from a previous version of
            // Anolysis (still using the legacy endpoints: `new_install`,
            // `reappearing_user`, `active_user`). We do not want to consider
            // these users as new installs (which means they need to indicate
            // that they sent their demographics before), but we do not want
            // them to be considered updates to existing demographics either
            // (because the backend is only looking at demographics collected
            // using the new endpoint, and not the legacy ones, and it would not
            // make sense to try to account for an update from demographics
            // which we do not keep track of), so the solution in this case is
            // to send a value for `previousDemographicsSentDate` (to signal
            // that this is an update), but no value for `previousDemographics`.
            //
            // Because `getLastRawDemographics` was added while implementing the
            // new `send_demographics` mechanism, it will return `undefined` for
            // any existing user who updates, and is therefor a good proxy to
            // detect if the previous demographics should be sent or not.
            //
            // Note that this will only apply the first time demographics are
            // sent after update/install, since a value for `lastRawDemographics`
            // will be set as soon as the update has been performed.
            && this.getLastRawDemographics() !== undefined
          ) ? JSON.parse(this.getRegisteredDemographics())
            : undefined
        ),

        // We also send the date the demographics were sent so that the backend
        // is able to compute the size of the population in different time windows.
        previousDemographicsSentDate: this.getLastTimeDemographicSent(),
      });
      logger.debug('Success sending demographics');

      // Update state with newly sent demographics
      await Promise.all([
        this.setLastTimeDemographicSent(getSynchronizedDateFormatted()),
        this.setRegisteredDemographics(formattedDemographics),

        // We set the last normalized raw demographics that were communicated to the
        // backend after they were sent. It will be used in the future to detect
        // when demographics change.
        this.setLastRawDemographics(JSON.stringify(this.demographics)),
      ]);
    } catch (ex) {
      logger.error('Could not send demographics', ex);
    }
  }

  /**
   * Try to update GID from backend.
   */
  async handleGidUpdate() {
    logger.debug('handleGidUpdate');
    try {
      const gid = await this.backend.updateGID(this.getRegisteredDemographics());
      logger.debug('success handleGidUpdate', gid);

      await Promise.all([
        this.setLastGIDUpdateDate(getSynchronizedDateFormatted()),
        this.setCurrentGID(gid),
      ]);
    } catch (ex) {
      // If we were not able to retrieve a valid GID, then the user will
      // continue to use its current group until an updated GID can be received,
      // or empty string if no GID was received before.
      logger.log('failed to update GID, will be retried later', ex);
    }
  }

  /**
   * Real implementation of `getGID`, extracted in a separate method so that
   * `getGID` only handles the logic of several concurrent calls to `getGID`
   * (which should resolve to the same Promise).
   *
   * This function will inspect the state of the client (using `this.storage`),
   * and figure out the best course of action to get a group (e.g.: send
   * granular demographics if needed, update gid, etc.).
   */
  async _getGID() {
    const currentDate = getSynchronizedDate();
    const currentDateFormatted = getSynchronizedDateFormatted();

    // Check if we already stored an install date. If not, it means Anolysis is
    // started for the first time.
    if (!this.getNewInstallDate()) {
      await this.setNewInstallDate(currentDateFormatted);
    }

    // Send demographics if needed. The check is performed directly in
    // `handleSendDemographics` so no need to check here. Moreover, there is no
    // need to handle different cases such as "new install", "reapearing user",
    // "active user" anymore.
    await this.handleSendDemographics();

    // At this point, we know that granular demographics were sent to the
    // backend before if needed. This means that `getRegisteredDemographics()`
    // will return the normalized version of the demographics from gid server.

    // If we are the first day after install, the user will send his granular
    // demographics instead of a group id to the backend (since no group was
    // created with these demographics yet).
    const installDate = moment(this.getNewInstallDate(), DATE_FORMAT);
    if (installDate.isSame(currentDate, 'day')) {
      // If the call to `send_demographics` failed for some reason (e.g.:
      // backend was not reachable), then this will return `undefined` which
      // will be transformed into '' (empty string) by `getGID`.
      return this.getRegisteredDemographics();
    }

    // If we are more than one day after the install but we do not have a GID
    // yet, then we should request it from backend.
    if (this.getCurrentGID() === undefined) {
      await this.handleGidUpdate();
    } else {
      // If a GID is already present, check if it's not out-of-date.
      const gidUpdateDate = moment(this.getLastGIDUpdateDate(), DATE_FORMAT);

      // We will allow the client to check for an updated GID at most once per
      // day. Currently groups are computed every day (which does not mean the
      // groups will be different all the time, but some group might become more
      // 'granular' and loose less information).
      if (currentDate.diff(gidUpdateDate, 'days') >= 1) {
        await this.handleGidUpdate();
      }
    }

    return this.getCurrentGID();
  }

  /**
   * This is the only public API which should be used from the GID manager. It
   * is used any-time we want to know the group of a user. Internally it will
   * use `_getGID` to achieve this. Moreover, if `getGID` is called several
   * times concurrently, all the calls will resolve to the same promise (to
   * avoid any race condition, duplicated action or inconsistant state in the
   * `_getGID` logic).
   */
  async getGID() {
    // If `getGIDPromise` exists, then it means we are already performing a
    // `_getGID` and we return the same promise.
    if (this.getGIDPromise !== null) {
      return this.getGIDPromise;
    }

    // Start a new call to `_getGID` and store the promise globally for re-use
    // in sub-sequent calls if needed. This promise will already resolve (never
    // reject). If no group could be retrieved, then an empty string will be
    // returned.
    this.getGIDPromise = (async () => {
      try {
        return (await this._getGID()) || '';
      } catch (ex) {
        logger.error('Could not get GID', ex);
        inject.service('telemetry', ['push']).push(
          { context: 'gid-manager', exception: `${ex}` },
          'metrics.anolysis.health.exception',
        );
        return '';
      } finally {
        this.getGIDPromise = null;
      }
    })();

    return this.getGIDPromise;
  }
}
