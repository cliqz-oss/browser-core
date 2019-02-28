import Adblocker from '../../platform/lib/adblocker';
import ResourceLoader from '../../core/resource-loader';
import config from '../../core/config';
import {
  extractHostname as getHostname,
  getGeneralDomain as getDomain,
} from '../../core/tlds';
import logger from '../common/offers_v2_logger';

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

const ENGINES = {
  adblocker: () => new Adblocker.FiltersEngine({
    loadCosmeticFilters: false,
  })
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
      }
    );
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
    this.loader.load().catch(e => logger.warn(`Can't load blacklist rules: ${e}`));
  }

  unload() {
    this.engine = null;
    this.filters = null;
    this.loader.stop();
    this.loader = null;
  }

  update({ filters = [] }) {
    const list = filters.join('\n');
    this.engine.deleteLists(['blacklist']);
    this.engine.updateList({
      name: 'blacklist',
      list,
      checksum: `${Adblocker.fastHash(list)}`,
    });
  }

  has(url) {
    const result = this.engine.match(Adblocker.makeRequest(
      { url, type: 2, sourceUrl: url },
      { getDomain, getHostname },
    ));
    return result.match;
  }
}
