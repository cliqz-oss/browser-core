/* eslint-disable func-names */
import { Components, XPCOMUtils } from './globals';

class ProviderAutoCompleteResultCliqz {
  constructor(searchString, searchResult, defaultIndex) {
    this._searchString = searchString;
    this._searchResult = searchResult;
    this._defaultIndex = defaultIndex;
    this._errorDescription = '';
    this._results = [];
  }

  get searchString() { return this._searchString; }

  get searchResult() { return this._searchResult; }

  get defaultIndex() { return this._defaultIndex; }

  get errorDescription() { return this._errorDescription; }

  get matchCount() { return this._results.length; }

  getValueAt(index) { return (this._results[index] || {}).val; }

  getFinalCompleteValueAt(index) { return this.getValueAt(index); }

  getCommentAt(index) { return (this._results[index] || {}).comment; }

  getStyleAt(index) { return (this._results[index] || {}).style; }

  getImageAt(index) { return (this._results[index] || {}).image || ''; }

  getLabelAt(index) { return (this._results[index] || {}).label; }

  getDataAt(index) { return (this._results[index] || {}).data; }

  setResults(results) {
    this._results = results;
  }
}

class ProviderAutoCompleteSearch {
  startSearch(searchString, searchParam, previousResult, listener) {
    if (!searchString.trim()) {
      return;
    }

    const result = new ProviderAutoCompleteResultCliqz(
      searchString,
      Components.interfaces.nsIAutoCompleteResult.RESULT_SUCCESS,
      -2, // blocks autocomplete
      ''
    );

    result.setResults([{}]);

    listener.onSearchResult(this, result);
  }

  stopSearch() {
  }
}

class AutocompleteComponent {
  constructor() {
    this.reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    this.FFcontract = {
      classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
      classDescription: 'Cliqz',
      contractID: '@mozilla.org/autocomplete/search;1?name=cliqz-results',
      QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIAutoCompleteSearch])
    };
  }

  unregister() {
    try {
      this.reg.unregisterFactory(
        this.reg.contractIDToCID(this.FFcontract.contractID),
        this.reg.getClassObjectByContractID(
          this.FFcontract.contractID,
          Components.interfaces.nsISupports
        )
      );
    } catch (e) {
      // empty
    }
  }

  register() {
    Object.assign(ProviderAutoCompleteSearch.prototype, this.FFcontract);
    const cp = ProviderAutoCompleteSearch.prototype;
    const factory = XPCOMUtils.generateNSGetFactory([ProviderAutoCompleteSearch])(cp.classID);
    this.reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);
  }
}

export default {
  init() {
    this.autocomplete = new AutocompleteComponent();
    this.autocomplete.unregister();
    this.autocomplete.register();
  },

  unload() {
    this.autocomplete.unregister();
  }
};
