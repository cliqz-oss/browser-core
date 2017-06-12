// TODO: remove dependency on autocomplete
import autocomplete from '../autocomplete/autocomplete';

export default class {
  constructor(window) {
    this.window = window;
  }

  get element() {
    // TODO: do not use global
    // need to get currently loaded popup - which is not obvious if we reload
    // urlbar, the popup is likely to be replaced
    return this.window.CLIQZ.Core.popup;
  }

  get query() {
    const ctrl = this.element.mInput.controller;
    return ctrl.searchString.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  get urlbarValue() {
    const urlbar = this.element.mInput;
    return urlbar.value;
  }

  get urlbarVisibleValue() {
    const urlbar = this.element.mInput;
    return urlbar.mInputField.value;
  }

  results() {
    const ctrl = this.element.mInput.controller;
    const resultCount = this.element._matchCount;
    const lastRes = autocomplete.lastResult;
    const rawResults = Array(resultCount).fill().map((_, i) => {
      const data = (lastRes && lastRes.getDataAt(i)) || {};
      const rawResult = {
        title: ctrl.getCommentAt(i),
        url: ctrl.getValueAt(i),
        description: (lastRes && lastRes.getDataAt(i) && lastRes.getDataAt(i).description) || '',
        originalUrl: ctrl.getValueAt(i),
        type: ctrl.getStyleAt(i),
        text: this.query,
        data,
        maxNumberOfSlots: (i === 0 ? 3 : 1),
      };
      return rawResult;
    });
    return {
      query: this.query,
      queriedAt: autocomplete.lastQueryTime,
      rawResults,
    };
  }

  execBrowserCommandHandler(...args) {
    const urlbar = this.element.mInput;
    urlbar.value = urlbar.mInputField.value;
    this.element.mInput.handleCommand(...args);
  }
}
