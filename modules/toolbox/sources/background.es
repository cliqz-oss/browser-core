import background from '../core/base/background';
import inject from '../core/kord/inject';
import prefs from '../core/prefs';
import { getDetailsFromUrl } from '../core/url';

const _setScheme = (url) => {
  const details = getDetailsFromUrl(url);
  const hasScheme = (details.scheme !== '') && (details.originalUrl.includes(details.scheme));
  return hasScheme ? details.scheme : 'https:';
};

const _getFullURLWithoutParameters = (url) => {
  const details = getDetailsFromUrl(url);
  const port = (details.port !== '') ? `:${details.port}` : '';
  return `${_setScheme(url)}//${details.cleanHost}${port}`;
};

const _getFullURL = (url) => {
  const details = getDetailsFromUrl(url);
  return `${_getFullURLWithoutParameters(url)}${details.extra}`;
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
    async getState(url) {
      return {
        endpointsUrl: _getFullURLWithoutParameters(this.settings.RICH_HEADER),
        extensionsLegacyEnabled: prefs.get('enabled', true, 'extensions.legacy.'),
        modules: await this.actions.getCliqzStatus(),
        showConsoleLogs: prefs.get('showConsoleLogs', true),
        signaturesRequired: prefs.get('required', false, 'xpinstall.signatures.'),

        // prefs for offers
        developer: prefs.get('developer', true),
        loggerLevel: prefs.get('logger.offers-v2.level', ''),
        offersDevFlag: prefs.get('offersDevFlag', true),
        offersLoadSignalsFromDB: prefs.get('offersLoadSignalsFromDB', true),
        offersLogsEnabled: prefs.get('offersLogsEnabled', true),
        offersTelemetryFreq: prefs.get('offersTelemetryFreq', ''),
        triggersBE: prefs.get('triggersBE', ''),

        // state from HumanWeb
        HWCheckUrlStatus: await this.deps.humanWeb.action('getURLCheckStatus', url)
          .catch(e => ({ message: e.message, stack: e.stack })),
        HWStatus: await this.deps.humanWeb.action(
          'getState',
          { msg },
        ).catch(e => ({ message: e.message, stack: e.stack })),
        timestamp: prefs.get('config_ts', null),
      };
    },
    setPref(name, value, prefix) {
      prefs.set(name, value, prefix);
      return true;
    },
    setEndpoints(address) {
      ['RICH_HEADER', 'RESULTS_PROVIDER', 'RESULTS_PROVIDER_LOG', 'RESULTS_PROVIDER_PING']
        .forEach((endpoint) => {
          const parameters = getDetailsFromUrl(this.settings[endpoint]).extra;
          this.settings[endpoint] = `${_getFullURL(address)}${parameters}`;
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
  },
});
