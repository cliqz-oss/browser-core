import moment from '../../platform/lib/moment';

import Backend from './backend-communication';
import getSynchronizedDate, { getSynchronizedDateFormatted, DATE_FORMAT } from './synchronized-date';
import logger from './logger';

const GID = 'anolysisGID';
const LAST_DEMOGRAPHICS_SENT_DATE = 'anolysisLastAliveSignal';
const LAST_GID_UPDATE_DATE = 'anolysisLastGIDUpdate';
const NEW_INSTALL_DATE = 'anolysisInstalled';
const NEW_INSTALL_SIGNAL_DATE = 'anolysisSentNewInstall';
const NORMALIZED_DEMOGRAPHICS = 'anolysisDemographics';

/**
 * This class is in charge of managing the safe group id of the user. At any
 * point of time, the `getGID` method will be used to get the most up-to-date
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
 *    report using the group ID (a.k.a. 'GID').
 * 3. If no GID could be fetched from the backend, GID manager will make sure
 *    the user is safe by reporting an empty string instead (or the previous GID
 *    received by the user, if any). The update will be retried at a later point
 *    until a safe GID is retrieved.
 *
 * The GID manager will make sure that in any of the possible states, the
 * correct course of action is choosen when we call the `getGID`.
 *
 * This manager is also responsible for reporting, once every 6 months, the
 * granular combination of factors once again, so that we can do some
 * book-keeping in the backend. This ensures that the backend is able to keep
 * track of active users (and forget about non-active ones; this is important to
 * make sure that we do not get the illusion of having safe groups, where most
 * users would never be active), while still preserving privacy (cf. paper for
 * more information on this mechanism).
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

    // Demographics are available through Anolysis' config.
    this.demographics = config.get('demographics');
    this.serializedDemographics = JSON.stringify(this.demographics);

    // This can hold a referrence to the result of `getGID` if we attempt
    // several concurrent calls to this method.
    this.getGIDPromise = null;
  }

  init(storage) {
    this.storage = storage;
  }

  /**
   * Manage the date at which we last updated the GID.
   */
  setLastGIDUpdateDate(date) {
    return this.storage.set(LAST_GID_UPDATE_DATE, date);
  }

  getLastGIDUpdateDate() {
    return this.storage.get(LAST_GID_UPDATE_DATE);
  }

  /**
   * Accessors used to keep track of the last normalized version of the
   * demographics returned by the backend (new_install, reappearing_user,
   * active_user). This normalized string is used to negociate a new GID with
   * the backend once in a while.
   *
   * A note about normalized demographics: the GID update procedure allows a
   * client to know its latest group without communicating its granular
   * demographics to the backend again (read comments in backend-communication.es
   * for more detail about this method). This requires the serialized version of
   * demographics (as a string) to be identical to the version known to the
   * backend. To achieve this, when a client sends demographics using one of
   * `new_install`, `reappearing_user` or `active_user`, the server will return
   * back a serialized and normalized version of the same demographics (this
   * property is checked by the client to make sure the backend cannot inject
   * arbitrary values and track the user). This normalized version is then
   * persisted in the client, and used whenever an update of the group is
   * required.
   */
  setRegisteredDemographics(demographics) {
    return this.storage.set(NORMALIZED_DEMOGRAPHICS, demographics);
  }

  getRegisteredDemographics() {
    return this.storage.get(NORMALIZED_DEMOGRAPHICS);
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
   * the first time Anolysis module is started.
   */
  setNewInstallDate(date) {
    return this.storage.set(NEW_INSTALL_DATE, date);
  }

  getNewInstallDate() {
    return this.storage.get(NEW_INSTALL_DATE);
  }

  /**
   * Accessors used to keep track of when the new_install or reappearing_user
   * signal was sent to the backend. Most of the time this should be the same as
   * what `getNewInstallDate` returns.
   */
  setSentNewInstall(date) {
    return this.storage.set(NEW_INSTALL_SIGNAL_DATE, date);
  }

  getSentNewInstall() {
    return this.storage.get(NEW_INSTALL_SIGNAL_DATE);
  }

  /**
   * Accessors used to keep track of the last time granular demographics were
   * communicated to the backend. This can be via one of: new_install,
   * reappearing_user, active_user.
   */
  setLastTimeDemographicSent(date) {
    return this.storage.set(LAST_DEMOGRAPHICS_SENT_DATE, date);
  }

  getLastTimeDemographicSent() {
    return this.storage.get(LAST_DEMOGRAPHICS_SENT_DATE);
  }

  async _handleDemographicsSending(send, { isNewInstall = false } = {}) {
    try {
      const formattedDemographics = await send(this.serializedDemographics);
      logger.debug('Success sending demographics');

      const currentDate = getSynchronizedDateFormatted();
      await this.setLastTimeDemographicSent(currentDate);
      await this.setRegisteredDemographics(formattedDemographics);

      if (isNewInstall) {
        await this.setSentNewInstall(currentDate);
      }
    } catch (ex) {
      logger.error('Could not send demographics', ex);
    }
  }

  /**
   * Send new_install signal to backend. A new install signal is sent to
   * communicate the granular demographics to the backend only once, the first
   * time Anolysis is started. The date Anolysis is started needs to be the same
   * as the install date of the browser/Cliqz, otherwise, a reappearing user
   * signal is sent.
   */
  async handleNewInstall() {
    logger.debug('handleNewInstall');
    await this._handleDemographicsSending(
      demographics => this.backend.newInstall(demographics),
      { isNewInstall: true },
    );
  }

  /**
   * Send reappearing_user signal to backend. A reappearing user signal is
   * treated the same way as new install, but is used to make the distinction
   * between new users (new_install) and users having already used Cliqz before
   * Anolysis was started for the first time (can happen if we rollout Anolysis
   * partially on some platform).
   */
  async handleReappearingUser() {
    logger.debug('handleReappearingUser');
    await this._handleDemographicsSending(
      demographics => this.backend.reappearingUser(demographics),
      { isNewInstall: true },
    );
  }

  /**
   * Send active_user signal to backend, only if we did not send granular
   * demographics during the last 6 months.
   */
  async handleActiveUserSignal() {
    // TODO: Right now all users will send this signal, but in the future we
    // might want to send it only with a given probability. eg: 75%.
    logger.debug('handleActiveUserSignal');

    // Check if we should send the 'alive signal' along with
    // the most granular demographic factors.
    const lastTimeDemographicsSent = this.getLastTimeDemographicSent();
    if (lastTimeDemographicsSent !== undefined) {
      logger.debug('Demographics have already been sent before');

      const currentDate = getSynchronizedDate();
      const lastDemographicSentDate = moment(lastTimeDemographicsSent, DATE_FORMAT);

      // We only send this signal if the last time we sent granular demographics
      // was more than 6 months ago.
      if (currentDate.diff(lastDemographicSentDate, 'days') >= 180) {
        logger.debug('handleActiveUserSignal send again');
        await this._handleDemographicsSending(
          demographics => this.backend.activeUserSignal(demographics),
          { isNewInstall: false },
        );
      }
    }
  }

  /**
   * Try to update GID from backend.
   */
  async handleUpdate() {
    logger.debug('handleUpdate');
    try {
      const gid = await this.backend.updateGID(this.getRegisteredDemographics());
      logger.debug('success handleUpdate', gid);

      await this.setLastGIDUpdateDate(getSynchronizedDateFormatted());
      await this.setCurrentGID(gid);
    } catch (ex) {
      // If we were not able to retrieve a valid GID, then the user will
      // continue to use its current group until an updated GID can be received,
      // or empty string if no GID was received before.
      logger.log('failed to update GID, will be retried later', ex);
    }
  }

  async _getGID() {
    const demographics = this.demographics;
    const currentDate = getSynchronizedDate();
    const currentDateFormatted = currentDate.format(DATE_FORMAT);

    // Check if we already stored an install date
    if (!this.getNewInstallDate()) {
      this.setNewInstallDate(currentDateFormatted);
    }

    // Extract Cliqz install date from demographics and parse it.
    const cliqzInstallDate = moment(demographics.install_date, 'YYYY/MM/DD').format(DATE_FORMAT);

    // If we did not register any install date yet (which happens when sending a
    // new_install signal or a reappearing_user signal), it means that this is
    // the first time the user uses Cliqz with anolysis, or that the previous
    // attempt to contact the backend failed. In the later case, it means we can
    // retry it.
    if (!this.getSentNewInstall()) {
      if (currentDateFormatted !== cliqzInstallDate) {
        await this.handleReappearingUser();
      } else {
        await this.handleNewInstall();
      }
    }

    // Check if sending an active user signal is necessary. If not, nothing will
    // be done.
    await this.handleActiveUserSignal();

    // At this point, we know that new install was sent before (or reappearing)
    const installDate = moment(this.getSentNewInstall(), DATE_FORMAT);

    // If we sent the new install or reappearing user this day, we should make
    // use of our granular demographics until we get a safe GID (from next day).
    if (installDate.isSame(currentDate, 'day')) {
      return this.getRegisteredDemographics();
    }

    // If we are more than one day after the install but we do not have a GID
    // yet, then we should request it from backend.
    if (this.getCurrentGID() === undefined) {
      await this.handleUpdate();
    } else {
      // If a GID is already present, check if it's not out-of-date.
      const gidUpdateDate = moment(this.getLastGIDUpdateDate(), DATE_FORMAT);

      // We will allow the client to check for an updated GID at most once a
      // month. Most of the time there will be no update, as this would make
      // analysis of signals more complex. But this is a reasonable trade-off
      // for several reasons:
      // 1. Check for updates do not reveal any personal information (not even
      //  the demographics) as we only communicate a short prefix of the hash of
      //  the demographics to the backend. The size of the prefix is such that
      //  there are always multiple collisions and only the client is able to
      //  know which group he really belongs to.
      // 2. Check for updates is pretty cheap: only one request to the backend.
      // 3. Most of the time there will be no update, as GIDs are only
      //  re-computed every few months, but this mechanism leaves some
      //  flexibility if we figure out a way to better aggregate users into group
      //  (meaning: loosing less information while creating groups, while keeping
      //  users safe).
      if (currentDate.diff(gidUpdateDate, 'hours') > 1) {
        await this.handleUpdate();
      }
    }

    return this.getCurrentGID();
  }

  async getGID() {
    if (this.getGIDPromise !== null) {
      return this.getGIDPromise;
    }

    this.getGIDPromise = (async () => {
      try {
        return (await this._getGID()) || '';
      } catch (ex) {
        return '';
      } finally {
        this.getGIDPromise = null;
      }
    })();

    return this.getGIDPromise;
  }
}
