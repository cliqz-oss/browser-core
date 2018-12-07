import { getChannel } from '../../platform/demographics';
import config from '../../core/config';
import prefs from '../../core/prefs';

async function shouldUseStaging() {
  const channel = await getChannel();
  return (
    prefs.get('developer', false) === true
    || channel === '99' // Jenkins
    || channel === 'MR99' // Jenkins
    || channel === 'MR02' // Debug
    || channel === 'MA99' // Jenkins
    || channel === 'MA02' // Debug
    || channel === 'MI99' // Jenkins
    || channel === 'MI02' // Debug
    || channel === 'MI52' // Debug
    || channel === 'MA52' // Debug
  );
}

function getPrefWithDefault(pref, defaultValue) {
  return {
    [pref]: prefs.get(pref, defaultValue),
  };
}

async function getDefaultConfig() {
  const useStaging = await shouldUseStaging();
  return {
    // TODO - temporary, send session with signals
    ...getPrefWithDefault('session'),

    // Backend communication
    'backend.url': (useStaging
      ? config.settings.ANOLYSIS_STAGING_BACKEND_URL
      : config.settings.ANOLYSIS_BACKEND_URL
    ),
    useStaging,

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

class Config {
  constructor(options, defaultConfig) {
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

export default async function createConfig(options = {}) {
  const defaultConfig = await getDefaultConfig();
  return new Config(options, defaultConfig);
}
