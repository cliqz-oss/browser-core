import Dropdown from './dropdown';
import Results from './results';
import Popup from './popup';
import events from '../core/events';
import inject from '../core/kord/inject';
import SupplementarySearchResult from './results/supplementary-search';
import HistoryManager from '../core/history-manager';
import NavigateToResult from './results/navigate-to';
import { isUrl, equals } from '../core/url';
import { enterSignal, removeFromHistorySignal } from './telemetry';
import AdultAssistant from './adult-content-assistant';
import LocationAssistant from './location-sharing-assistant';
import { getTabsWithUrl, closeTab } from '../core/tabs';
import { copyToClipboard } from '../core/clipboard';
import { nextTick } from '../core/decorators';

export default class Ui {

  constructor(window, id, { getSessionCount, searchMode }) {
    this.window = window;
    this.extensionID = id;
    this.getSessionCount = getSessionCount;
    this.updateFirstResult = this.updateFirstResult.bind(this);
    this.searchMode = searchMode;

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
    if (this.searchMode !== 'autocomplete') {
      return;
    }
    this.window.gURLBar.addEventListener('keyup', this.updateFirstResult);
  }

  unload() {
    if (this.searchMode !== 'autocomplete') {
      return;
    }
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
    const isModifierPressed = ev.altKey || ev.metaKey || ev.ctrlKey;

    // no popup, so no interactions, unless Enter is pressed.
    // report telemetry signal in this case.
    if (this.popupClosed !== false) {
      // Trigger new search on ArrowDown as some FF versions
      // just reopen last popup (EX-6310).
      if (ev.code === 'ArrowDown') {
        this.core.action('refreshPopup', this.popup.query);
        return true;
      }

      if (ev.code === 'Enter' || ev.code === 'NumpadEnter') {
        enterSignal({
          query: this.window.gURLBar.textValue,
          newTab: isModifierPressed,
        });
      }
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
        const isNewTab = isModifierPressed;
        let clickedResult = null;
        preventDefault = true;

        if (this.popup.query === this.dropdown.results.query) {
          const urlbarValue = this.popup.urlbarValue;
          const urlbarVisibleValue = this.popup.urlbarVisibleValue;
          const firstResult = this.dropdown.results.firstResult;

          // find clicked result
          clickedResult =
            // check if it is a first autocompleted result
            (urlbarValue !== urlbarVisibleValue &&
            this.popup.query === urlbarValue &&
            firstResult.isAutocompleted && firstResult) ||
            // find result by urlbar value
            this.dropdown.results.findSelectable(urlbarValue) ||
            this.dropdown.results.findSelectable(urlbarVisibleValue) ||
            // find by selected index
            (this.dropdown.selectedIndex >= 0 &&
             this.dropdown.results.get(this.dropdown.selectedIndex));
        }

        enterSignal({
          query: this.popup.query,
          result: this.dropdown.selectedResult,
          clickedResult,
          results: this.dropdown.results,
          newTab: isNewTab,
        });

        if (clickedResult) {
          clickedResult.click(this.window, clickedResult.url, ev);
        } else {
          this.popup.close();
          this.popup.execBrowserCommandHandler(ev, isNewTab ? 'tab' : 'current');
        }
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (!ev.shiftKey || ev.metaKey || (ev.altKey && ev.ctrlKey)) {
          const { selectionStart, selectionEnd } = this.popup.urlbarSelectionRange;
          if (selectionStart !== selectionEnd) {
            // wait for next tick so urlbarValue to contain the query after deletion
            nextTick(() => {
              const urlbarValue = this.popup.urlbarValue.trim();
              if (urlbarValue === '') {
                return;
              }
              this.core.action('refreshPopup', urlbarValue);
            });
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
      isNewSearchMode: this.popup.isNewSearchMode
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
    } else {
      // if no results found make sure we clear autocompleted
      // query in urlbar (see EX-5648)
      this.autocompleteQuery('', '');
    }

    // TODO remove this after switching to a new mixer completely
    if (!this.popup.isNewSearchMode && !didAutocomplete && !hasInstantResults) {
      if (queryIsUrl) {
        results.prepend(
          new NavigateToResult({ text: results.query })
        );
      } else if (queryIsNotEmpty) {
        const supplementaryResult = new SupplementarySearchResult({
          text: results.query,
          defaultSearchResult: true,
          data: {
            suggestion: this.popup.query
          }
        });

        // Added SupplementarySearch might be a duplicate of the one from
        // search suggestions (see EX-5321). Make sure we removed them.
        results.results = results.results.filter(r => !equals(supplementaryResult.url, r.url));
        results.prepend(supplementaryResult);
      }
    }
    this.dropdown.renderResults(results);
    this.popup.open();
  }
}
