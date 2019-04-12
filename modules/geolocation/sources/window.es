import inject from '../core/kord/inject';
import prefs from '../core/prefs';
import config from '../core/config';
import { getMessage } from '../core/i18n';

function getLocationPermState() {
  const data = {
    yes: {
      name: getMessage('always'),
      selected: false
    },
    ask: {
      name: getMessage('always_ask'),
      selected: false
    },
    no: {
      name: getMessage('never'),
      selected: false
    }
  };
  let currentState = prefs.get('share_location', config.settings.geolocation || 'ask');
  if (currentState === 'showOnce') {
    currentState = 'ask';
  }

  // default geolocation 'yes' for funnelCake - 'ask' for everything else
  data[currentState].selected = true;

  return data;
}

export default class Win {
  constructor() {
    this.geolocation = inject.service('geolocation', ['updateGeoLocation']);
  }

  init() {
    this.geolocation.updateGeoLocation();
  }

  unload() {
  }

  status() {
    return {
      visible: true,
      state: getLocationPermState()
    };
  }
}
