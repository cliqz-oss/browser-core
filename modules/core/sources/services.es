import { fetch } from './http';
import CONFIG from './config';
import prefs from './prefs';
import console from './console';
import utils from './utils';
import events from './events';
import { isOnionModeFactory } from './platform';
import { isSearchServiceReady } from './search-engines';
import { service as logos } from './services/logos';
import { service as domainInfo } from './services/domain-info';
import { service as pacemaker } from './services/pacemaker';
import { service as telemetry } from './services/telemetry';
import { service as session } from './services/session';


const isOnionMode = isOnionModeFactory(prefs);
const services = {
  utils: () => utils.init(),
  logos,
  telemetry,
  // IP driven configuration
  'cliqz-config': () => {
    const EXPECTED_CONFIGS = new Set([
      'backends',
      'language_whitelist',
      'locale_whitelist',
      'location',
      'location.city',
      'location.granular',
      'logoVersion',
      'png_logoVersion',
      'ts',
    ]);

    if (isOnionMode()) {
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
        console.log('cliqz-config update succeeded');
      }).catch(e => console.log('cliqz-config update failed', e));

    let interval = setInterval(update, 1000 * 60 * 60);
    services['cliqz-config'].unload = () => {
      clearInterval(interval);
      interval = null;
    };
    return update();
  },
  session,
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
