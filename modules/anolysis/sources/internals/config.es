import config from '../../core/config';
import prefs from '../../core/prefs';

function shouldUseStaging() {
  return (
    prefs.get('developer', false) === true ||
    config.settings.channel === '99'
  );
}

const DEFAULT_CONFIG = {
  // Backend communication
  'backend.url': (shouldUseStaging()
    ? config.settings.ANOLYSIS_STAGING_BACKEND_URL
    : config.settings.ANOLYSIS_BACKEND_URL
  ),

  // Signal queue
  'signalQueue.batchSize': 5,
  'signalQueue.sendInterval': 15 * 1000,
  'signalQueue.maxAttempts': 5,

  // Demographics
  demographics: null,

  // Storage implementation
  Storage: null,
};

export default class Config {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_CONFIG,
      ...options,
    };
  }

  get(pref) {
    if (this.options[pref] === undefined) {
      throw new Error(`Anolysis config has no such entry: ${pref}`);
    }

    return this.options[pref];
  }
}
