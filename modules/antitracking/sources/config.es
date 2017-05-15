import * as persist from './persistent-state';
import events from '../core/events';
import ResourceLoader from '../core/resource-loader';
import resourceManager from '../core/resource-manager';
import utils from '../core/utils';

const VERSIONCHECK_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json';
const CONFIG_URL = 'https://cdn.cliqz.com/anti-tracking/config.json';

export const DEFAULTS = {
  safekeyValuesThreshold: 4,
  shortTokenLength: 6,
  placeHolder: 'cliqz.com/tracking',
  cliqzHeader: 'CLIQZ-AntiTracking',
  enabled: true,
  cookieEnabled: true,
  qsEnabled: true,
  bloomFilterEnabled: true,
};

export const PREFS = {
  enabled: 'modules.antitracking.enabled',
  cookieEnabled: 'attrackBlockCookieTracking',
  qsEnabled: 'attrackRemoveQueryStringTracking',
  fingerprintEnabled: 'attrackCanvasFingerprintTracking',
  referrerEnabled: 'attrackRefererTracking',
  trackerTxtEnabled: 'trackerTxt',
  bloomFilterEnabled: 'attrackBloomFilter',
  forceBlockEnabled: 'attrackForceBlock',
  overrideUserAgent: 'attrackOverrideUserAgent',
  cookieTrustReferers: 'attrackCookieTrustReferers',
};

/**
 * These are attributes which are loaded from the remote CONFIG_URL
 * @type {Array}
 */
const REMOTELY_CONFIGURED = ['blockRules', 'reportList', 'cookieWhitelist', 'subdomainRewriteRules'];

export default class {

  constructor({ defaults = DEFAULTS,
                versionUrl = VERSIONCHECK_URL }) {
    this.debugMode = false;
    this.versionCheckUrl = versionUrl;

    this.tokenDomainCountThreshold = 2;
    this.safeKeyExpire = 7;
    this.localBlockExpire = 24;

    Object.assign(this, defaults);

    this.safekeyValuesThreshold = parseInt(persist.getValue('safekeyValuesThreshold'), 10) ||
                                  this.safekeyValuesThreshold;
    this.shortTokenLength = parseInt(persist.getValue('shortTokenLength'), 10) ||
                            this.shortTokenLength;
    this.placeHolder = persist.getValue('placeHolder') || this.placeHolder;
    this.cliqzHeader = persist.getValue('cliqzHeader') || this.cliqzHeader;

    this.loadPrefs();
  }

  loadPrefs() {
    Object.keys(PREFS).forEach((conf) => {
      this[conf] = utils.getPref(PREFS[conf], this[conf] || false);
    });
  }

  setPref(name, value) {
    if (!PREFS[name]) {
      throw new Error(`pref ${name} not known`);
    }
    utils.setPref(PREFS[name], value);
  }

  onPrefChange(pref) {
    if (Object.keys(PREFS).map(n => PREFS[n]).indexOf(pref) > -1) {
      this.loadPrefs();
    }
  }

  init() {
    const versionCheckLoader = new ResourceLoader(['antitracking', 'versioncheck.json'], {
      remoteURL: this.versionCheckUrl,
      cron: 1000 * 60 * 60 * 12,
    });
    resourceManager.addResourceLoader(versionCheckLoader, this._updateVersionCheck.bind(this));

    const configLoader = new ResourceLoader(['antitracking', 'config.json'], {
      remoteURL: CONFIG_URL,
      cron: 1000 * 60 * 60 * 12,
    });
    resourceManager.addResourceLoader(configLoader, this._updateConfig.bind(this));
    return Promise.resolve();
  }

  unload() {
  }

  _updateVersionCheck(versioncheck) {
    // config in versioncheck
    if (versioncheck.placeHolder) {
      persist.setValue('placeHolder', versioncheck.placeHolder);
      this.placeHolder = versioncheck.placeHolder;
    }

    if (versioncheck.shortTokenLength) {
      persist.setValue('shortTokenLength', versioncheck.shortTokenLength);
      this.shortTokenLength = parseInt(versioncheck.shortTokenLength, 10) || this.shortTokenLength;
    }

    if (versioncheck.safekeyValuesThreshold) {
      persist.setValue('safekeyValuesThreshold', versioncheck.safekeyValuesThreshold);
      this.safekeyValuesThreshold = parseInt(versioncheck.safekeyValuesThreshold, 10) ||
                                    this.safekeyValuesThreshold;
    }

    if (versioncheck.cliqzHeader) {
      persist.setValue('cliqzHeader', versioncheck.cliqzHeader);
      this.cliqzHeader = versioncheck.cliqzHeader;
    }

    // fire events for list update
    events.pub('attrack:updated_config', versioncheck);
  }

  _updateConfig(config) {
    REMOTELY_CONFIGURED.forEach((key) => {
      this[key] = config[key];
    });
  }

}

