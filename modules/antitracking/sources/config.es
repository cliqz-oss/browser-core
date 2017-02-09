import * as persist from 'antitracking/persistent-state';
import events from 'core/events';
import ResourceLoader from 'core/resource-loader';
import { Promise } from 'core/cliqz';

const VERSIONCHECK_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json';

const DEFAULTS = {
  safekeyValuesThreshold: 4,
  shortTokenLength: 8,
  placeHolder: 'cliqz.com/tracking',
  cliqzHeader: 'CLIQZ-AntiTracking',
};

export default class {

  constructor({ defaults = DEFAULTS,
                versionUrl = VERSIONCHECK_URL }) {
    this.versionCheckUrl = versionUrl;

    this.tokenDomainCountThreshold = 2;
    this.safeKeyExpire = 7;
    this.localBlockExpire = 24;

    this.safekeyValuesThreshold = parseInt(persist.getValue('safekeyValuesThreshold'), 10) ||
                                  defaults.safekeyValuesThreshold;
    this.shortTokenLength = parseInt(persist.getValue('shortTokenLength'), 10) ||
                            defaults.shortTokenLength;
    this.placeHolder = persist.getValue('placeHolder') || defaults.placeHolder;
    this.cliqzHeader = persist.getValue('cliqzHeader') || defaults.cliqzHeader;
  }

  init() {
    this._versioncheckLoader = new ResourceLoader(['antitracking', 'versioncheck.json'], {
      remoteURL: this.versionCheckUrl,
      cron: 1000 * 60 * 60 * 12,
    });
    this._versioncheckLoader.load().then(this._updateVersionCheck.bind(this));
    this._versioncheckLoader.onUpdate(this._updateVersionCheck.bind(this));
    return Promise.resolve();
  }

  unload() {
    if (this._versioncheckLoader) {
      this._versioncheckLoader.stop();
    }
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

}

