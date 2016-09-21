import { utils } from "core/cliqz";
import { isFirefox } from "core/platform";
import autocomplete from "autocomplete/autocomplete";
import SpellCheck from "autocomplete/spell-check";
import historyCluster from "autocomplete/history-cluster";
import ResultProviders from "autocomplete/result-providers";
import SmartCliqzCache from 'autocomplete/smart-cliqz-cache/smart-cliqz-cache';
import TriggerUrlCache from 'autocomplete/smart-cliqz-cache/trigger-url-cache';
import Result from "autocomplete/result";
import WikipediaDeduplication from "autocomplete/wikipedia-deduplication";
import Mixer from "autocomplete/mixer";

class AutocompleteComponent {
  constructor() {
    this.reg = Cm.QueryInterface(Ci.nsIComponentRegistrar);
    this.FFcontract = {
      classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
      classDescription : 'Cliqz',
      contractID: '@mozilla.org/autocomplete/search;1?name=cliqz-results',
      QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteSearch ])
    };
  }

  unregister() {
    try {
      this.reg.unregisterFactory(
        this.reg.contractIDToCID(this.FFcontract.contractID),
        this.reg.getClassObjectByContractID(
          this.FFcontract.contractID,
          Ci.nsISupports
        )
      );
    } catch(e) {

    }
  }

  register() {
    Object.assign(autocomplete.CliqzResults.prototype, this.FFcontract);
    const cp = autocomplete.CliqzResults.prototype;
    const factory = XPCOMUtils.generateNSGetFactory([autocomplete.CliqzResults])(cp.classID);
    this.reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);
  }
}

function onReady() {
  return new Promise( resolve => {
    if (isFirefox && Services.search && Services.search.init) {
      Services.search.init(resolve);
    } else {
      resolve();
    }
  });
}

export default {

  init(settings) {
    return onReady().then( () => {
      ResultProviders.init();
      autocomplete.CliqzResultProviders = ResultProviders;

      SpellCheck.init();
      autocomplete.CliqzHistoryCluster = historyCluster;

      this.smartCliqzCache = new SmartCliqzCache();
      this.triggerUrlCache = new TriggerUrlCache();
      this.triggerUrlCache.init();

      if (isFirefox) {
        Mixer.init({
          smartCliqzCache: this.smartCliqzCache,
          triggerUrlCache: this.triggerUrlCache,
        });
        this.autocompleteComponent = new AutocompleteComponent();
        this.autocompleteComponent.unregister();
        this.autocompleteComponent.register();
        utils.RERANKERS.push(WikipediaDeduplication);
      } else {
        Mixer.init();
      }
      autocomplete.Mixer = Mixer;

      utils.getBackendResults = utils.getCliqzResults;
      // glueing stuff
      autocomplete.spellCheck = SpellCheck;
      utils.autocomplete = autocomplete;

      utils.registerResultProvider({
        ResultProviders,
        Result
      });
    });
  },

  unload() {
    if (isFirefox) {
      this.autocompleteComponent.unregister();
    }

    this.smartCliqzCache.unload();
    this.triggerUrlCache.unload();
  },

  beforeBrowserShutdown() {

  }
}
