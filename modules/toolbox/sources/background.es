import background from '../core/base/background';
import inject from '../core/kord/inject';
import prefs from '../core/prefs';

const getDomainAndParametersFromUrl = (url) => {
  const idx = url.split('/', 3).join('/').length;
  return {
    domain: url.substring(0, idx),
    parameters: url.substring(idx),
  };
};

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  deps: {
    core: inject.module('core'),
  },
  /**
    @method init
    @param settings
  */
  init(settings) {
    this.settings = settings;
  },

  unload() {},

  beforeBrowserShutdown() {},

  events: {},

  actions: {
    async getState() {
      return {
        modules: await this.actions.getCliqzStatus(),
        endpointsUrl: getDomainAndParametersFromUrl(this.settings.RICH_HEADER).domain,
        showConsoleLogs: prefs.get('showConsoleLogs', true),
        extensionsLegacyEnabled: prefs.get('enabled', true, 'extensions.legacy.'),
        signaturesRequired: prefs.get('required', false, 'xpinstall.signatures.'),

        // prefs for offers
        developer: prefs.get('developer', true),
        offersDevFlag: prefs.get('offersDevFlag', true),
        offersLogsEnabled: prefs.get('offersLogsEnabled', true),
        triggersBE: prefs.get('triggersBE', ''),
        offersLoadSignalsFromDB: prefs.get('offersLoadSignalsFromDB', true),
        offersTelemetryFreq: prefs.get('offersTelemetryFreq', 10),
        loggerLevel: prefs.get('logger.offers-v2.level', 'log'),
      };
    },
    setPref(name, value, prefix) {
      prefs.set(name, value, prefix);
      return true;
    },
    setEndpoints(address) {
      ['RICH_HEADER', 'RESULTS_PROVIDER', 'RESULTS_PROVIDER_LOG', 'RESULTS_PROVIDER_PING']
        .forEach((endpoint) => {
          const parameters = getDomainAndParametersFromUrl(this.settings[endpoint]).parameters;
          this.settings[endpoint] = `${address}${parameters}`;
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
