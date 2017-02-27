import utils from '../core/utils';
import Dropdown from './dropdown';
import Popup from './popup';
import SupplementarySearchResult from './results/supplementary-search';
import NavigateToResult from './results/navigate-to';
import { isUrl } from '../core/url';
import { enterSignal } from './telemetry';

export default class {

  constructor(window) {
    this.handleResults = this.handleResults.bind(this);
    this.window = window;
  }

  init() {
  }

  selectAutocomplete() {
  }

  clearAutocomplete() {
  }

  sessionEnd() {
    this.dropdown.selectionIndex = -1;
  }

  keyDown(ev) {
    // no popup, so no interactions
    if (!this.popup.isOpen) {
      return;
    }

    switch (ev.code) {
      case 'ArrowUp': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        const result = this.dropdown.previousResult();
        utils.callWindowAction(this.window, 'ui', 'setUrlbarValue', [result.url, result.displayUrl]);
        return true;
      }
      case 'ArrowDown': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        const result = this.dropdown.nextResult();
        utils.callWindowAction(this.window, 'ui', 'setUrlbarValue', [result.url, result.displayUrl]);
        return true;
      }
      case 'Tab': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        let result;
        if (ev.shiftKey) {
          result = this.dropdown.previousResult();
        } else {
          result = this.dropdown.nextResult();
        }
        utils.callWindowAction(this.window, 'ui', 'setUrlbarValue', [result.url, result.displayUrl]);
        return true;
      }
      case 'Enter': {
        enterSignal({
          dropdown: this.dropdown,
          query: this.popup.query,
          newTab: ev.altKey || ev.metaKey,
        });

        if (this.popup.query !== this.dropdown.results.query) {
          return false;
        }

        const urlbarValue = this.popup.urlbarValue;
        const urlbarVisibleValue = this.popup.urlbarVisibleValue;
        const firstResult = this.dropdown.results.firstResult;
        if ((urlbarValue !== urlbarVisibleValue) && (this.popup.query === urlbarValue) && firstResult.isAutocompleted) {
          this.dropdown.results.firstResult.click(this.window, firstResult.url, ev);
          return true;
        }

        const result = this.dropdown.results.findSelectable(this.popup.urlbarVisibleValue);
        if (result) {
          result.click(this.window, result.url, ev);
          return true;
        }

        return false;
      }
    }
  }

  main(element) {
    this.dropdown = new Dropdown(element, this.window);
    this.dropdown.init();
    this.popup = new Popup(this.window.CLIQZ.Core.popup);
  }

  handleResults() {
    const results = this.popup.results();
    const queryIsUrl = isUrl(results.query);
    const firstResult = results.firstResult;
    let didAutocomplete;

    if (results.firstResult) {
      didAutocomplete = this.autocompleteQuery(
        firstResult.url,
        firstResult.title,
      );
      firstResult.isAutocompleted = didAutocomplete;
    }

    if (!didAutocomplete) {
      if (queryIsUrl) {
        results.prepend(
          new NavigateToResult({ text: results.query })
        )
      } else {
        results.prepend(
          new SupplementarySearchResult({ text: results.query })
        )
      }
    }

    this.dropdown.renderResults(results);
  }
}
