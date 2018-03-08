import utils from "../core/utils";
import Search from "../autocomplete/search";
import { Components, XPCOMUtils } from './globals';

function generateAutocompleteProvider(searchHolder) {
  const ProviderAutoCompleteSearch = function() {
    this.search = searchHolder.search;
  };

  ProviderAutoCompleteSearch.prototype.startSearch = function(searchString, searchParam, previousResult, listener) {
    this.search.search(searchString, listener.onSearchResult.bind(listener, this));
  }

  ProviderAutoCompleteSearch.prototype.stopSearch = function() {
    utils.clearTimeout(this.search.resultsTimer);
    utils.clearTimeout(this.search.historyTimer);
  }
  return ProviderAutoCompleteSearch;
}

class AutocompleteComponent {
  constructor() {
    this.searchHolder = {
      get search() {
        if (!this._search) {
          this._search = new Search({
            successCode: Components.interfaces.nsIAutoCompleteResult.RESULT_SUCCESS,
          });
        }
        return this._search;
      },
      unload() {
        if (this._search) {
          this._search.unload();
        }
      }
    };
    this.reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    this.FFcontract = {
      classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
      classDescription : 'Cliqz',
      contractID: '@mozilla.org/autocomplete/search;1?name=cliqz-results',
      QueryInterface: XPCOMUtils.generateQI([ Components.interfaces.nsIAutoCompleteSearch ])
    };
  }

  unregister() {
    try {
      this.searchHolder.unload();
      this.reg.unregisterFactory(
        this.reg.contractIDToCID(this.FFcontract.contractID),
        this.reg.getClassObjectByContractID(
          this.FFcontract.contractID,
          Components.interfaces.nsISupports
        )
      );
    } catch(e) {

    }
  }

  register() {
    const ProviderAutoCompleteSearch = generateAutocompleteProvider(this.searchHolder);
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
    this.autocomplete.register();
  },

  unload() {
    this.autocomplete.unregister();
  }
};

export let Window = {
  init() {},
  unload() {}
}
