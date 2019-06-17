import background from '../core/base/background';
import events from '../core/events';
import inject from '../core/kord/inject';
import prefs from '../core/prefs';
import ResourceLoader from '../core/resource-loader';
import { URLInfo } from '../core/url-info';

const _getURLWithProtocol = (url) => {
  const fullUrl = url.startsWith('http')
    ? url
    : `http://${url}`;
  return fullUrl;
};

const _getFullURL = ({ newUrl, prevUrl }) => {
  let fullUrl = _getURLWithProtocol(newUrl);
  const hostInfo = URLInfo.get(prevUrl);
  const parameters = hostInfo.href.replace(hostInfo.origin, '');

  if (fullUrl[fullUrl.length - 1] === '/') {
    fullUrl = fullUrl.substr(0, fullUrl.length - 1);
  }

  return `${fullUrl}${parameters}`;
};

const msg = {
  ver: '2.4',
  ts: '20170212',
  'anti-duplicates': 4105180,
  action: 'page',
  type: 'humanweb',
  payload: {
    a: 76,
    c: null,
    e: { mm: 0, sc: 0, kp: 0, cp: 0, md: 0 },
    url: 'https://www.arzt-auskunft.de/',
    st: '200',
    x: {
      ni: 2,
      pagel: 'de',
      nl: 34,
      nfsh: 0,
      nifsh: 1,
      lt: 7989,
      nf: 1,
      nifshmatch: true,
      canonical_url: 'https://www.arzt-auskunft.de/',
      ctry: 'de',
      lh: 36324,
      iall: true,
      nfshmatch: true,
      ninh: 2,
      nip: 0,
      nfshbf: 1,
      nifshbf: 1,
      t: 'Dr. med. Andreas Seifert, Hautarzt in Trier | Arzt-Auskunft'
    },
    dur: 23333,
    ref: 'https://www.google.de/ (PROTECTED)',
    red: null
  }
};

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  deps: {
    core: inject.module('core'),
    humanWeb: inject.module('human-web'),
    'offers-v2': inject.module('offers-v2'),
    telemetry: inject.module('telemetry'),
  },
  /**
    @method init
    @param settings
  */
  init(settings) {
    this.settings = settings;
  },

  unload() {},

  beforeBrowserShutdown() { },

  events: {},

  actions: {
    getEndpointsState() {
      return {
        endpointsUrl: URLInfo.get(this.settings.RESULTS_PROVIDER).href,
      };
    },
    async getHumanWebState(url) {
      return {
        HWCheckUrlStatus: await this.deps.humanWeb.action('getURLCheckStatus', url)
          .catch(e => ({ message: e.message, stack: e.stack })),
        HWStatus: await this.deps.humanWeb.action(
          'getState',
          { msg },
        ).catch(e => ({ message: e.message, stack: e.stack })),
      };
    },
    async getModulesState() {
      return {
        modules: await this.actions.getCliqzStatus(),
      };
    },
    async getOffersState() {
      return {
        offersStatus: await this.deps['offers-v2'].action('getOffersStatus'),
      };
    },
    getPreferencesState(prefName) {
      return {
        preferencesStatus: {
          config_location: prefs.get('config_location', ''),
          custom: prefs.get(prefName, 'N/A'),
          developer: prefs.get('developer', 'N/A'),
          'logger.offers-v2.level': prefs.get('logger.offers-v2.level', ''),
          offersDevFlag: prefs.get('offersDevFlag', 'N/A'),
          offersLoadSignalsFromDB: prefs.get('offersLoadSignalsFromDB', 'N/A'),
          offersLogsEnabled: prefs.get('offersLogsEnabled', 'N/A'),
          offersTelemetryFreq: prefs.get('offersTelemetryFreq', 'N/A'),
          showConsoleLogs: prefs.get('showConsoleLogs', 'N/A'),
          signaturesRequired: prefs.get('required', 'N/A', 'xpinstall.signatures.'),
          triggersBE: prefs.get('triggersBE', 'N/A'),
        },
      };
    },
    async getResourceLoadersState() {
      return {
        RLStatus: await this.actions.getResourceLoaders(),
      };
    },
    async getTelemetryState() {
      return {
        telemetryStatus: await this.deps.telemetry.action('getTrk'),
      };
    },
    setPref(name, value) {
      prefs.set(name, value);
      return true;
    },
    setEndpoints({ address = '', reset = false }) {
      const prevUrl = reset
        ? 'https://api.cliqz.com/api/v2/results?nrh=1&q='
        : this.settings.RESULTS_PROVIDER;
      const fullUrl = _getFullURL({ newUrl: address, prevUrl });

      ['RICH_HEADER', 'RESULTS_PROVIDER', 'RESULTS_PROVIDER_LOG']
        .forEach((endpoint) => {
          this.settings[endpoint] = fullUrl;
        });
    },
    async getCliqzStatus() {
      const res = await this.deps.core.action('status');

      if (!res || !res.modules) {
        throw new Error('Core did not return correct status (no modules)!', res);
      }

      return Object.keys(res.modules)
        .filter(key => key !== 'core')
        .sort()
        .map(key => ({
          name: key,
          isEnabled: res.modules[key].isEnabled,
          loadingTime: res.modules[key].loadingTime || 0
        }));
    },
    enableModule(name) {
      return this.deps.core.action('enableModule', name);
    },
    disableModule(name) {
      this.deps.core.action('disableModule', name);
    },
    reloadExtension() {
      return this.deps.core.action('restart');
    },
    reloadOffers() {
      return this.deps['offers-v2'].action('softReloadOffers');
    },

    async getResourceLoaders() {
      const loaders = await ResourceLoader.loaders;
      const loadersLastUpdate = loaders.map((loader) => {
        const path = loader.resource.name.join('/');
        const pref = prefs.get(`resource-loader.lastUpdates.${path}`, 0);
        const lastUpdate = new Date(Number.parseInt(pref, 10));
        Object.assign(loader, { lastUpdate });
        return loader;
      });
      return loadersLastUpdate;
    },

    async updateFromRemote(loader) {
      const allLoaders = await ResourceLoader.loaders;
      const updatedLoader = allLoaders
        .find(el => el.resource.name.toString() === loader.resource.name.toString());
      const path = updatedLoader.resource.name.join('/');
      const pref = `resource-loader.lastUpdates.${path}`;
      const prefChanged = new Promise((resolve) => {
        const onPrefChanged = events.subscribe('prefchange', (changedPref) => {
          if (changedPref === pref) {
            onPrefChanged.unsubscribe();
            resolve();
          }
        });
      });
      await updatedLoader.updateFromRemote({ force: true });
      await prefChanged;
    }
  },
});
