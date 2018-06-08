import loadLogoDb from '../platform/load-logo-db';
import { fetch } from './http';
import CONFIG from './config';
import prefs from './prefs';
import console from './console';
import utils from './utils';
import events from './events';
import { isOnionMode } from './platform';

export default {
  utils: () => utils.init(),
  logos: () => loadLogoDb(),

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
      .then(() => utils.setInterval(update, 1000 * 60 * 60));
  },
  session: () => {
    if (!prefs.has('session')) {
      const session = [
        utils.rand(18),
        utils.rand(6, '0123456789'),
        '|',
        utils.getServerDay(),
        '|',
        CONFIG.settings.channel || 'NONE',
      ].join('');

      prefs.set('session', session);
      prefs.set('install_date', session.split('|')[1]);
      prefs.set('new_session', true);

      if (!prefs.has('freshtab.state')) {
        // freshtab is opt-out since 2.20.3
        prefs.set('freshtab.state', true);
      }
    } else {
      prefs.set('new_session', false);
    }
  },
};
