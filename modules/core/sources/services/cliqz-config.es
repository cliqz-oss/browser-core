import { fetch } from '../http';
import CONFIG from '../config';
import events from '../events';
import i18n from '../i18n';
import prefs from '../prefs';
import console from '../console';
import pacemaker from './pacemaker';
import { nextTick } from '../decorators';
import inject from '../kord/inject';
import { isOnionModeFactory } from '../platform';

const isOnionMode = isOnionModeFactory(prefs);

function setDefaultCountryIndex() {
  const selectedCountry = prefs.get('backend_country', '');
  const supportedCountries = JSON.parse(prefs.get('config_backends', '["de"]'));
  const unsupportedCountrySelection = supportedCountries.indexOf(selectedCountry) === -1;

  // we only set the prefered backend once at first start
  // or we reset if it's unsupported
  if (selectedCountry === '' || unsupportedCountrySelection) {
    const location = prefs.get('config_location', 'de');
    if (supportedCountries.indexOf(location) !== -1) {
      // supported country
      prefs.set('backend_country', location);
    } else if (i18n.currLocale === 'de') {
      // unsupported country - fallback to
      //    'de' for german speaking users
      prefs.set('backend_country', 'de');
    } else {
      //    'us' for everybody else
      prefs.set('backend_country', 'us');
    }
  }
}

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

async function updateCliqzConfig() {
  return fetch(CONFIG.settings.CONFIG_PROVIDER)
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

      setDefaultCountryIndex();

      events.pub('cliqz-config:update');
      console.log('cliqz-config update succeeded');
    }).catch(e => console.log('cliqz-config update failed', e));
}

export function service() {
  if (isOnionMode()) {
    return Promise.resolve();
  }

  let interval = null;
  nextTick(() => {
    interval = pacemaker.everyHour(updateCliqzConfig);
  });

  service.unload = () => {
    if (interval !== null) {
      interval.stop();
      interval = null;
    }
  };

  return updateCliqzConfig();
}

export default inject.service('cliqz-config', []);
