import loadLogoDb from '../platform/load-logo-db';
import { fetch } from './http';
import CONFIG from './config';
import prefs from './prefs';
import console from './console';
import utils from './utils';
import events from './events';

export default {
  logos: () => loadLogoDb().then(utils.setLogoDb),

  // IP driven configuration
  'cliqz-config': () => {
    const update = () => fetch(CONFIG.settings.CONFIG_PROVIDER)
      .then(r => r.json())
      .then((config) => {
        Object.keys(config).forEach((k) => {
          let val = config[k];

          if (typeof val === 'object') {
            val = JSON.stringify(config[k]);
          }

          prefs.set(`config_${k}`, val);
        });

        // we only set the prefered backend once at first start
        if (prefs.get('backend_country', '') === '') {
          // we fallback to german results if we did not decode the location
          utils.setDefaultIndexCountry(prefs.get('config_location', 'de'));
        }

        events.pub('cliqz-config:update');
      }).catch(console.error.bind(console));

    return update()
      .then(() => utils.setInterval(update, 1000 * 60 * 60));
  },
};
