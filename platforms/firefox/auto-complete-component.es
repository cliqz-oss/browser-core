import { utils } from "core/cliqz";
import Search from "autocomplete/search";

class ProviderAutoCompleteSearch {
  constructor() {
    this.search = new Search({
      successCode: Components.interfaces.nsIAutoCompleteResult.RESULT_SUCCESS,
    });
  }

  startSearch(searchString, searchParam, previousResult, listener){
    this.search.search(searchString, listener.onSearchResult.bind(listener, this));
  }

  stopSearch() {
    utils.clearTimeout(this.search.resultsTimer);
    utils.clearTimeout(this.search.historyTimer);
  }
}

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
    Object.assign(ProviderAutoCompleteSearch.prototype, this.FFcontract);
    const cp = ProviderAutoCompleteSearch.prototype;
    const factory = XPCOMUtils.generateNSGetFactory([ProviderAutoCompleteSearch])(cp.classID);
    this.reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);
  }
}

export let background = {
  init() {
    this.autocomplete = new AutocompleteComponent();
    this.autocomplete.unregister();
    this.autocomplete.register()
  },

  unload() {
    this.autocomplete.unregister();
  }
};

export let Window = {
  init() {},
  unload() {}
}
