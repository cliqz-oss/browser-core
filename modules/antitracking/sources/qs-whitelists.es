/* eslint no-restricted-syntax: 'off' */
/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */

import * as persist from '../core/persistent-state';
import * as datetime from './time';
import { httpGet } from '../core/http';
import events from '../core/events';
import md5 from '../core/helpers/md5';
import QSWhitelistBase from './qs-whitelist-base';
import extConfig from '../core/config';
import console from '../core/console';

const updateExpire = 48;

export default class QSWhitelist extends QSWhitelistBase {
  constructor(config) {
    super(config);
    this.safeTokens = new persist.LazyPersistentObject('tokenExtWhitelist');
    this.trackerDomains = new persist.LazyPersistentObject('trackerDomains');
    this.unsafeKeys = new persist.LazyPersistentObject('unsafeKey');
    this.lastUpdate = ['0', '0', '0', '0'];

    this.TOKEN_WHITELIST_URL = `${extConfig.settings.CDN_BASEURL}/anti-tracking/whitelist/whitelist_tokens.json`;
    this.TRACKER_DM_URL = `${extConfig.settings.CDN_BASEURL}/anti-tracking/whitelist/tracker_domains.json`;
    this.SAFE_KEY_URL = `${extConfig.settings.CDN_BASEURL}/anti-tracking/whitelist/domain_safe_key.json`;
    this.UNSAFE_KEY_URL = `${extConfig.settings.CDN_BASEURL}/anti-tracking/whitelist/domain_unsafe_key.json`;
  }

  init() {
    try {
      this.lastUpdate = JSON.parse(persist.getValue('lastUpdate'));
      if (this.lastUpdate.length !== 4) {
        throw new Error('invalid lastUpdate value');
      }
    } catch (e) {
      this.lastUpdate = ['0', '0', '0', '0'];
    }

    // list update events
    this.onConfigUpdate = (config) => {
      const currentSafeKey = persist.getValue('safeKeyExtVersion', '');
      const currentToken = persist.getValue('tokenWhitelistVersion', '');
      const currentUnsafeKey = persist.getValue('unsafeKeyExtVersion', '');
      const currentTracker = persist.getValue('trackerDomainsversion', '');
      // check safekey
      console.log(`Safe keys: ${config.safekey_version} vs ${currentSafeKey}`, 'attrack');
      if (config.safekey_version && currentSafeKey !== config.safekey_version) {
        this._loadRemoteSafeKey(config.force_clean === true);
      }
      console.log(`Token whitelist: ${config.whitelist_token_version} vs ${currentToken}`, 'attrack');
      if (config.token_whitelist_version && currentToken !== config.whitelist_token_version) {
        this._loadRemoteTokenWhitelist();
      }
      console.log(`Tracker Domain: ${config.tracker_domain_version} vs ${currentTracker}`, 'attrack');
      if (config.tracker_domain_version && currentTracker !== config.tracker_domain_version) {
        this._loadRemoteTrackerDomainList();
      }
      console.log(`Unsafe keys: ${config.unsafekey_version} vs ${currentUnsafeKey}`, 'attrack');
      if (config.token_whitelist_version && currentToken !== config.token_whitelist_version) {
        this._loadRemoteUnsafeKey();
      }
    };

    return Promise.all([
      super.init(),
      this.safeTokens.load(),
      this.unsafeKeys.load(),
      this.trackerDomains.load(),
    ]).then(() => {
      this._configEventListener = events.subscribe('attrack:updated_config', this.onConfigUpdate);
    });
  }

  destroy() {
    super.destroy();
    if (this._configEventListener) {
      this._configEventListener.unsubscribe();
      this._configEventListener = null;
    }
  }

  isUpToDate() {
    const delay = updateExpire;
    const hour = datetime.newUTCDate();
    hour.setHours(hour.getHours() - delay);
    const hourCutoff = datetime.hourString(hour);
    return this.lastUpdate.every(t => t > hourCutoff);
  }

  isReady() {
    // just check they're not null
    return this.safeTokens.value && this.safeKeys.value
      && this.unsafeKeys.value && this.trackerDomains.value;
  }

  isSafeKey(domain, key) {
    if (!this.isReady()) {
      return true;
    }
    return (!this.isUnsafeKey(domain, key)) && domain in this.safeKeys.value
      && key in this.safeKeys.value[domain];
  }

  isUnsafeKey(domain, key) {
    if (!this.isReady()) {
      return false;
    }
    return this.isTrackerDomain(domain) && domain in this.unsafeKeys.value
      && key in this.unsafeKeys.value[domain];
  }

  addSafeKey(domain, key, valueCount) {
    if (!this.isReady()) {
      return;
    }
    if (this.isUnsafeKey(domain, key)) {
      return; // keys in the unsafekey list should not be added to safekey list
    }
    const today = datetime.dateString(datetime.newUTCDate());
    if (!(domain in this.safeKeys.value)) {
      this.safeKeys.value[domain] = {};
    }
    this.safeKeys.value[domain][key] = [today, 'l', valueCount];
    this.safeKeys.setDirty();
  }

  isTrackerDomain(domain) {
    if (!this.isReady()) {
      return false;
    }
    return domain in this.trackerDomains.value;
  }

  isSafeToken(domain, token) {
    if (!this.isReady()) {
      return true;
    }
    return this.isTrackerDomain(domain) && token in this.safeTokens.value;
  }

  addSafeToken(domain, token) {
    if (!this.isReady()) {
      return;
    }
    this.trackerDomains.value[domain] = true;
    if (token && token !== '') {
      this.safeTokens.value[token] = true;
    }
  }

  addUnsafeKey(domain, key) {
    if (!this.isReady()) {
      return;
    }
    if (!(domain in this.unsafeKeys.value)) {
      this.unsafeKeys.value[domain] = {};
    }
    this.unsafeKeys.value[domain][key] = true;
  }

  getVersion() {
    return {
      whitelist: persist.getValue('tokenWhitelistVersion', ''),
      safeKey: persist.getValue('safeKeyExtVersion', ''),
      unsafeKey: persist.getValue('unsafeKeyExtVersion', ''),
      trackerDomains: persist.getValue('trackerDomainsVersion', '')
    };
  }

  _loadRemoteTokenWhitelist() {
    const today = datetime.getTime().substring(0, 10);
    httpGet(`${this.TOKEN_WHITELIST_URL}?${today}`, function (req) {
      const rList = JSON.parse(req.response);
      const rListMd5 = md5(req.response);
      this.safeTokens.setValue(rList);
      persist.setValue('tokenWhitelistVersion', rListMd5);
      this.lastUpdate[1] = datetime.getTime();
      persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
      events.pub('attrack:token_whitelist_updated', rListMd5);
    }.bind(this),
    () => {},
    100000);
  }

  _loadRemoteTrackerDomainList() {
    const today = datetime.getTime().substring(0, 10);
    httpGet(`${this.TRACKER_DM_URL}?${today}`, function (req) {
      const rList = JSON.parse(req.response);
      const rListMd5 = md5(req.response);
      this.trackerDomains.setValue(rList);
      persist.setValue('trackerDomainsversion', rListMd5);
      this.lastUpdate[3] = datetime.getTime();
      persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
    }.bind(this),
    () => {},
    100000);
  }

  _loadRemoteSafeKey(forceClean) {
    const today = datetime.getTime().substring(0, 10);
    if (forceClean) {
      this.safeKeys.clear();
    }
    httpGet(`${this.SAFE_KEY_URL}?${today}`, function (req) {
      const safeKey = JSON.parse(req.response);
      let s;
      let k;
      const safeKeyExtVersion = md5(req.response);
      for (s in safeKey) {
        if (Object.prototype.hasOwnProperty.call(safeKey, s)) {
          for (k in safeKey[s]) {
            if (Object.prototype.hasOwnProperty.call(safeKey[s], k)) {
              // r for remote keys
              safeKey[s][k] = [safeKey[s][k], 'r'];
            }
          }
        }
      }
      for (s in safeKey) {
        if (!(s in this.safeKeys.value)) {
          this.safeKeys.value[s] = safeKey[s];
        } else {
          for (const key in safeKey[s]) {
            if (this.safeKeys.value[s][key] == null ||
                this.safeKeys.value[s][key][0] < safeKey[s][key][0]) {
              this.safeKeys.value[s][key] = safeKey[s][key];
            }
          }
        }
      }
      this._pruneSafeKeys();
      this.lastUpdate[0] = datetime.getTime();
      persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
      this.safeKeys.setDirty();
      this.safeKeys.save();
      persist.setValue('safeKeyExtVersion', safeKeyExtVersion);
      events.pub('attrack:safekeys_updated', safeKeyExtVersion, forceClean);
    }.bind(this),
    () => {
      // on error
    }, 60000
    );
  }

  _loadRemoteUnsafeKey() {
    const today = datetime.getTime().substring(0, 10);
    console.log(this.UNSAFE_KEY_URL);
    httpGet(`${this.UNSAFE_KEY_URL}?${today}`, function (req) {
      const unsafeKeys = JSON.parse(req.response);
      const unsafeKeyExtVersion = md5(req.response);
      this.unsafeKeys.setValue(unsafeKeys);
      this.lastUpdate[2] = datetime.getTime();
      persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
      persist.setValue('unsafeKeyExtVesion', unsafeKeyExtVersion);
      this.unsafeKeys.setDirty();
      this.unsafeKeys.save();
    }.bind(this), () => {}, 100000);
  }
}
