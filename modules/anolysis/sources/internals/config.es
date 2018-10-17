import config from '../../core/config';
import prefs from '../../core/prefs';

function shouldUseStaging() {
  return (
    prefs.get('developer', false) === true ||
    config.settings.channel === '99' || // Jenkins
    config.settings.channel === 'MR99' || // Jenkins
    config.settings.channel === 'MR02' || // Debug
    config.settings.channel === 'MA99' || // Jenkins
    config.settings.channel === 'MA02' || // Debug
    config.settings.channel === 'MI99' || // Jenkins
    config.settings.channel === 'MI02' || // Debug
    config.settings.channel === 'MI52' || // Debug
    config.settings.channel === 'MA52' // Debug
  );
}

function getPrefWithDefault(pref, defaultValue) {
  return {
    [pref]: prefs.get(pref, defaultValue),
  };
}

function getDefaultConfig() {
  return {
    // TODO - temporary, send session with signals
    ...getPrefWithDefault('session'),

    // Backend communication
    'backend.url': (shouldUseStaging()
      ? config.settings.ANOLYSIS_STAGING_BACKEND_URL
      : config.settings.ANOLYSIS_BACKEND_URL
    ),

    // Signal queue
    ...getPrefWithDefault('signalQueue.batchSize', 5),
    ...getPrefWithDefault('signalQueue.sendInterval', 15 * 1000),
    ...getPrefWithDefault('signalQueue.maxAttempts', 5),

    // Demographics
    demographics: null,

    // Storage implementation
    Storage: null,
  };
}

export default class Config {
  constructor(options = {}) {
    const defaultConfig = getDefaultConfig();
    // Create default config
    this.options = new Map();
    Object.keys(defaultConfig).forEach((name) => {
      this.options.set(name, defaultConfig[name]);
    });

    // Optionally override with `options`
    Object.keys(options).forEach((name) => {
      this.options.set(name, options[name]);
    });
  }

  get(pref) {
    if (!this.options.has(pref)) {
      throw new Error(`Anolysis config has no such entry: ${pref}`);
    }

    return this.options.get(pref);
  }
}
