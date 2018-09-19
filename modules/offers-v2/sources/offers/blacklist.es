import Adblocker from '../../platform/lib/adblocker';
import ResourceLoader from '../../core/resource-loader';
import config from '../../core/config';

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

const ENGINES = {
  adblocker: () => {
    const engine = new Adblocker.FiltersEngine({
      version: 0.1,
      loadNetworkFilters: true,
      loadCosmeticFilters: false,
    });
    return engine;
  },
};

const LOADERS = {
  'resource-loader': () => {
    const loader = new ResourceLoader(
      ['offers-v2', 'rules.json.gz'],
      {
        cron: ONE_DAY,
        updateInterval: ONE_HOUR,
        dataType: 'json',
        remoteURL: `${config.settings.CDN_BASEURL}/offers/display_rules/rules.json.gz`
      });
    return loader;
  },
};

export default class Blacklist {
  constructor({ engine = 'adblocker', loader = 'resource-loader' } = {}) {
    this.engine = typeof engine === 'string' ? ENGINES[engine]() : engine;
    this.loader = typeof loader === 'string' ? LOADERS[loader]() : loader;
  }

  init() {
    this.loader.updateFromRemote({ force: true });
    this.loader
      .onUpdate(({ negation_rules: negationRules = [] } = {}) => {
        this.update({ filters: negationRules });
      });
    this.loader.load();
  }

  unload() {
    this.engine = null;
    this.filters = null;
    this.loader.stop();
    this.loader = null;
  }

  update({ filters = [] }) {
    this.engine.onUpdateFilters(
      [{ checksum: '', asset: 'asset', filters: filters.join('\n') }],
      new Set(['asset']),
    );
  }

  has(url) {
    const request = { url, cpt: 2, sourceUrl: url };
    const result = this.engine.match(request);
    return result.match;
  }
}
