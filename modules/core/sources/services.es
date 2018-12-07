import { fetch } from './http';
import CONFIG from './config';
import prefs from './prefs';
import console from './console';
import utils from './utils';
import random from './helpers/random';
import events from './events';
import { isOnionMode } from './platform';
import { isSearchServiceReady } from './search-engines';
import { service as logos } from './services/logos';
import { service as domainInfo } from './services/domain-info';
import { service as pacemaker } from './services/pacemaker';
import getSynchronizedDate, { isSynchronizedDateAvailable } from './synchronized-time';
import { dateToDaysSinceEpoch } from './helpers/date';

const services = {
  utils: () => utils.init(),
  logos,
  // IP driven configuration
  'cliqz-config': () => {
    const EXPECTED_CONFIGS = new Set([
      'backends',
      'language_whitelist',
      'location',
      'location.city',
      'location.granular',
      'logoVersion',
      'png_logoVersion',
      'ts',
    ]);

    if (isOnionMode) {
      return Promise.resolve();
    }
    const update = () => fetch(CONFIG.settings.CONFIG_PROVIDER)
      .then(r => r.json())
      .then((config) => {
        Object.keys(config).forEach((k) => {
          if (!EXPECTED_CONFIGS.has(k)) {
            return;
          }

          let val = config[k];

          if (typeof val === 'object') {
            val = JSON.stringify(config[k]);
          }

          prefs.set(`config_${k}`, val);
        });

        // Set install date if not already set before. This is done as soon as
        // we get a valid `config_ts` value from the config endpoint.
        if (!prefs.has('install_date') && config.ts) {
          prefs.set('install_date', config.ts);
        }

        utils.setDefaultCountryIndex();

        events.pub('cliqz-config:update');
      }).catch(e => console.log('cliqz-config update failed', e));

    return update()
      .then(() => setInterval(update, 1000 * 60 * 60));
  },
  session: () => {
    if (!prefs.has('session')) {
      // Get number of days since epoch either from config_ts if available
      // (through `getSynchronizedDate`) or fallback to the `Date` API (which
      // is dependent on the timezone of the system).
      const installDate = (isSynchronizedDateAvailable()
        ? dateToDaysSinceEpoch(getSynchronizedDate())
        : utils.getDay()
      );

      const session = [
        random(18),
        random(6, '0123456789'),
        '|',
        installDate,
        '|',
        CONFIG.settings.channel || 'NONE',
      ].join('');

      prefs.set('session', session);

      if (!prefs.has('freshtab.state')) {
        // freshtab is opt-out since 2.20.3
        prefs.set('freshtab.state', true);
      }
    }
  },
  'search-services': isSearchServiceReady,
  domainInfo,
  pacemaker,
};

if (CONFIG.environment !== 'production') {
  services['test-helpers'] = function testHelpers() {
    testHelpers.prefs = prefs;
  };
}

export default services;
