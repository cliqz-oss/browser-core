import Dropdown from './dropdown';
import Results from './results';
import Popup from './popup';
import events from '../core/events';
import inject from '../core/kord/inject';
import SupplementarySearchResult from './results/supplementary-search';
import HistoryManager from '../core/history-manager';
import NavigateToResult from './results/navigate-to';
import { isUrl } from '../core/url';
import { enterSignal, removeFromHistorySignal } from './telemetry';
import AdultAssistant from './adult-content-assistant';
import LocationAssistant from './location-sharing-assistant';
import { getTabsWithUrl, closeTab } from '../core/tabs';
import { copyToClipboard } from '../core/clipboard';

export default class {

  constructor(window, id, { getSessionCount }) {
    this.window = window;
    this.extensionID = id;
    this.getSessionCount = getSessionCount;
    this.updateFirstResult = this.updateFirstResult.bind(this);

    this.ui = inject.module('ui');
    this.core = inject.module('core');
    this.geolocation = inject.module('geolocation');
    this.autocomplete = inject.module('autocomplete');

    this.adultAssistant = new AdultAssistant();
    this.locationAssistant = new LocationAssistant({
      updateGeoLocation: this.geolocation.action.bind(this.geolocation, 'updateGeoLocation'),
      resetGeoLocation: this.geolocation.action.bind(this.geolocation, 'resetGeoLocation'),
    });
  }

  init() {
    this.window.gURLBar.addEventListener('keyup', this.updateFirstResult);
  }

  unload() {
    this.window.gURLBar.removeEventListener('keyup', this.updateFirstResult);
  }

  selectAutocomplete() {
  }

  clearAutocomplete() {
  }

  sessionEnd() {
    if (this.dropdown) { // this might be called before the initiaization
      this.dropdown.selectedIndex = -1;
      this.adultAssistant.resetAllowOnce();
      this.locationAssistant.resetAllowOnce();
    }
  }

  keyDown(ev) {
    let preventDefault = false;

    // no popup, so no interactions
    if (this.popupClosed) {
      return false;
    }

    switch (ev.code) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        this.ui.windowAction(this.window, 'syncUrlbarValue');
        break;
      }
      case 'ArrowUp': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        const result = this.dropdown.previousResult();
        this.ui.windowAction(this.window, 'setUrlbarValue', result.url, result.displayUrl);
        preventDefault = true;
        break;
      }
      case 'ArrowDown': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        const result = this.dropdown.nextResult();
        this.ui.windowAction(this.window, 'setUrlbarValue', result.url, result.displayUrl);
        preventDefault = true;
        break;
      }
      case 'Tab': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        let result;
        if (ev.shiftKey) {
          result = this.dropdown.previousResult();
        } else {
          result = this.dropdown.nextResult();
        }
        this.ui.windowAction(this.window, 'setUrlbarValue', result.url, result.displayUrl);
        preventDefault = true;
        break;
      }
      case 'Enter':
      case 'NumpadEnter': {
        const isNewTab = ev.altKey || ev.metaKey || ev.ctrlKey;
        preventDefault = true;
        enterSignal({
          dropdown: this.dropdown,
          newTab: isNewTab,
        });

        if (this.popup.query === this.dropdown.results.query) {
          const urlbarValue = this.popup.urlbarValue;
          const urlbarVisibleValue = this.popup.urlbarVisibleValue;
          const firstResult = this.dropdown.results.firstResult;
          if ((urlbarValue !== urlbarVisibleValue)
            && (this.popup.query === urlbarValue)
            && firstResult.isAutocompleted) {
            this.dropdown.results.firstResult.click(this.window, firstResult.url, ev);
            break;
          }

          const result = this.dropdown.results.findSelectable(urlbarValue) ||
            this.dropdown.results.findSelectable(urlbarVisibleValue);
          if (result) {
            result.click(this.window, result.url, ev);
            break;
          }

          if (this.dropdown.selectedIndex >= 0) {
            const selectedResult = this.dropdown.results.get(this.dropdown.selectedIndex);
            selectedResult.click(this.window, selectedResult.url, ev);
            break;
          }
        }

        this.popup.close();
        this.popup.execBrowserCommandHandler(ev, isNewTab ? 'tab' : 'current');
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (!ev.shiftKey || ev.metaKey || (ev.altKey && ev.ctrlKey)) {
          const { selectionStart, selectionEnd } = this.popup.urlbarSelectionRange;
          if (selectionStart !== selectionEnd) {
            this.core.action('refreshPopup', this.dropdown.results.query);
          }
          break;
        }
        const selectedResult = this.dropdown.selectedResult;
        if (!selectedResult.isDeletable) {
          break;
        }

        const url = selectedResult.rawUrl;
        HistoryManager.removeFromHistory(url);
        if (selectedResult.isBookmark) {
          HistoryManager.removeFromBookmarks(url);
          removeFromHistorySignal({ withBookmarks: true });
        } else {
          removeFromHistorySignal({});
        }

        getTabsWithUrl(this.window, url).forEach(tab => closeTab(this.window, tab));

        this.core.action('refreshPopup', this.dropdown.results.query);
        preventDefault = true;
        break;
      }
      default: {
        preventDefault = false;
      }
    }
    return preventDefault;
  }

  main(element) {
    this.dropdown = new Dropdown(element, this.window, this.extensionID);
    this.dropdown.init();
    this.popup = new Popup(this.window);
  }

  updateFirstResult() {
    const oldResults = this.dropdown.results;

    if (!oldResults || this.dropdown.selectedIndex === -1) {
      return;
    }

    const query = this.popup.query;

    if (
      (oldResults.query !== query) &&
      (
        (oldResults.firstResult instanceof NavigateToResult) ||
        (oldResults.firstResult instanceof SupplementarySearchResult)
      )
    ) {
      oldResults.firstResult.rawResult.text = query;

      this.dropdown.renderResults(oldResults);
      this.popup.open();
    }
  }

  render({
    query,
    queriedAt,
    rawResults,
  }) {
    events.pub('ui:results', rawResults);

    const results = new Results({
      query,
      queriedAt,
      rawResults,
      queryCliqz: this.core.action.bind(this.core, 'queryCliqz'),
      adultAssistant: this.adultAssistant,
      locationAssistant: this.locationAssistant,
      rerender: () => this.dropdown.renderResults(results),
      getSnippet: this.autocomplete.action.bind(this.autocomplete, 'getSnippet'),
      copyToClipboard,
    });
    const queryIsUrl = isUrl(results.query);
    const queryIsNotEmpty = query.trim() !== '';
    const firstResult = results.firstResult;
    let didAutocomplete;
    let hasInstantResults;

    if (results.firstResult) {
      didAutocomplete = this.autocompleteQuery(
        firstResult.url,
        firstResult.title,
      );
      firstResult.isAutocompleted = didAutocomplete;
      hasInstantResults = firstResult.rawResult.type === 'navigate-to' ||
        firstResult.rawResult.type === 'supplementary-search';
    }

    // TODO move these to mixer (EX-4497: Old dropdown cleanup)
    if (!didAutocomplete && !hasInstantResults) {
      if (queryIsUrl) {
        results.prepend(
          new NavigateToResult({ text: results.query })
        );
      } else if (queryIsNotEmpty) {
        results.prepend(
          new SupplementarySearchResult({
            text: results.query,
            defaultSearchResult: true,
            data: {
              suggestion: results.query
            }
          })
        );
      }
    }
    this.dropdown.renderResults(results);
    this.popup.open();
  }
}
