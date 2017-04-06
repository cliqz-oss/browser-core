import { utils } from 'core/cliqz';
import environment from 'platform/environment';
import { isFirefox } from 'core/platform';
import autocomplete from 'autocomplete/autocomplete';
import historyCluster from 'autocomplete/history-cluster';
import ResultProviders from 'autocomplete/result-providers';
import CliqzSearchCountryProviders from "autocomplete/cliqz-backends";
import Result from 'autocomplete/result';
import WikipediaDeduplication from 'autocomplete/wikipedia-deduplication';
import { background as AutocompleteBackground } from 'platform/auto-complete-component';
import background from 'core/base/background';
import Search from 'autocomplete/search';
import ResultCache from 'autocomplete/result-cache';

function onReady() {
  return new Promise(resolve => {
    if (isFirefox && Services.search && Services.search.init) {
      Services.search.init(resolve);
    } else {
      resolve();
    }
  });
}


export default background({

  enabled() {
    return true;
  },

  init() {
    this.resultCache = new ResultCache();
    Search.fetchAndCacheResult = this.resultCache.getResult.bind(this.resultCache);
    Search.clearResultCache = this.resultCache.clear.bind(this.resultCache);
    this.autocomplete = autocomplete;
    this.autocomplete.setup();
    return onReady().then(() => {
      autocomplete.CliqzResultProviders = new ResultProviders();
      autocomplete.CliqzSearchCountryProviders = new CliqzSearchCountryProviders();
      AutocompleteBackground.init();
      if (isFirefox) {
        environment.RERANKERS.push(new WikipediaDeduplication());
      }

      autocomplete.CliqzHistoryCluster = historyCluster;

      // glueing stuff
      utils.autocomplete = autocomplete;
      utils.registerResultProvider({
        ResultProviders: autocomplete.CliqzResultProviders,
        Result,
      });
    });
  },

  unload() {
    AutocompleteBackground.unload();
  },

  beforeBrowserShutdown() {

  },
  events: {
    'autocomplete:disable-search': function({urlbar}){
      utils.setPref('cliqzBackendProvider.enabled', false);
      if (environment.disableCliqzResults) {
        environment.disableCliqzResults(urlbar);
      }
    },
    'autocomplete:enable-search': function({urlbar}){
      utils.setPref('cliqzBackendProvider.enabled', true);
      if (environment.enableCliqzResults) {
        environment.enableCliqzResults(urlbar);
        utils.telemetry({
          type: 'setting',
          setting: 'international',
          value: 'activate',
        });
      }
    },
    'control-center:setDefault-search': function setDefaultSearchEngine(engine) {
      this.autocomplete.CliqzResultProviders.setCurrentSearchEngine(engine);
    },
    'control-center:setDefault-indexCountry': function setDefaultIndexCountry(country) {
      utils.setDefaultIndexCountry(country, true);
    },
    'core:urlbar_focus': function onUrlBarFocus() {
      if (isFirefox) {
        this.resultCache.clear();
      }
    },
  }
});
