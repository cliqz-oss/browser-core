import { fetch } from './http';
import CONFIG from './config';
import prefs from './prefs';
import console from './console';
import utils from './utils';
import random from './helpers/random';
import events from './events';
import { isOnionMode, isCliqzBrowser } from './platform';
import { isSearchServiceReady, addCustomSearchEngine } from './search-engines';
import { service as logos } from './services/logos';
import { service as telemetry } from './services/telemetry';
import { service as domainInfo } from './services/domain-info';
import i18n from './i18n';

const services = {
  utils: () => utils.init(),
  telemetry,
  logos,
  // IP driven configuration
  'cliqz-config': () => {
    const EXPECTED_CONFIGS = new Set([
      'backends',
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

        utils.setDefaultCountryIndex();

        events.pub('cliqz-config:update');
      }).catch(e => console.log('cliqz-config update failed', e));

    return update()
      .then(() => setInterval(update, 1000 * 60 * 60));
  },
  session: () => {
    if (!prefs.has('session')) {
      const session = [
        random(18),
        random(6, '0123456789'),
        '|',
        utils.getServerDay(),
        '|',
        CONFIG.settings.channel || 'NONE',
      ].join('');

      prefs.set('session', session);
      prefs.set('install_date', session.split('|')[1]);

      if (!prefs.has('freshtab.state')) {
        // freshtab is opt-out since 2.20.3
        prefs.set('freshtab.state', true);
      }

      if (isCliqzBrowser) {
        const configUpdate = events.subscribe('cliqz-config:update', () => {
          configUpdate.unsubscribe(); // we only need the first update

          // this should never happen but just to be double sure
          if (prefs.has('serp_test')) return;

          // we only activate the test for german users inside germany
          if (prefs.get('config_location') !== 'de' ||
              i18n.PLATFORM_LANGUAGE !== 'de') return;

          const r = Math.random();
          if (r < 0.33) {
            prefs.set('serp_test', 'A');
          } else if (r < 0.66) {
            prefs.set('serp_test', 'B');
            isSearchServiceReady().then(() =>
              addCustomSearchEngine('https://suche.cliqz.com/opensearch.xml', true));
          } else {
            prefs.set('serp_test', 'C');
            isSearchServiceReady().then(() =>
              addCustomSearchEngine('https://search.cliqz.com/opensearch.xml', true));
          }
        });
      }
    }
  },
  'search-services': () => isSearchServiceReady(),
  domainInfo,
};

if (CONFIG.environment !== 'production') {
  services['test-helpers'] = function testHelpers() {
    testHelpers.prefs = prefs;
  };
}

export default services;
