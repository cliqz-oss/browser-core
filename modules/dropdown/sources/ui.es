import Dropdown from './dropdown';
import Results from './results';
import Popup from './popup';
import events from '../core/events';
import inject from '../core/kord/inject';
import HistoryManager from '../core/history-manager';
import { enterSignal, removeFromHistorySignal } from './telemetry';
import AdultAssistant from './adult-content-assistant';
import LocationAssistant from './location-sharing-assistant';
import { getTabsWithUrl, closeTab, getCurrentTabId } from '../core/tabs';
import { copyToClipboard } from '../core/clipboard';

export default class Ui {
  deps = {
    'last-query': inject.module('last-query'),
    search: inject.module('search'),
  };

  constructor({ window, windowId, extensionID, getSessionCount }) {
    this.window = window;
    this.windowId = windowId;
    this.extensionID = extensionID;
    this.getSessionCount = getSessionCount;
    this.ui = inject.module('ui');
    this.core = inject.module('core');
    this.geolocation = inject.module('geolocation');
    this.adultAssistant = new AdultAssistant();
    this.locationAssistant = new LocationAssistant({
      updateGeoLocation: this.geolocation.action.bind(this.geolocation, 'updateGeoLocation'),
      resetGeoLocation: this.geolocation.action.bind(this.geolocation, 'resetGeoLocation'),
    });
  }

  init() {
  }

  unload() {
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

  syncUrlbarValue(result) {
    this.ui.windowAction(this.window, 'setUrlbarValue', result.url, { visibleValue: result.urlbarValue });
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
        this.syncUrlbarValue(result);
        preventDefault = true;
        break;
      }
      case 'ArrowDown': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        const result = this.dropdown.nextResult();
        this.syncUrlbarValue(result);
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
        this.syncUrlbarValue(result);
        preventDefault = true;
        break;
      }
      case 'Enter':
      case 'NumpadEnter': {
        const isNewTab = isModifierPressed;
        const clickedResult = this.dropdown.selectedResult;
        preventDefault = true;

        if (clickedResult) {
          enterSignal({
            query: this.popup.query,
            result: this.dropdown.selectedResult,
            clickedResult,
            results: this.dropdown.results,
            newTab: isNewTab,
          });

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

  render({
    query,
    queriedAt,
    rawResults,
  }) {
    events.pub('ui:results', {
      isPopupOpen: this.popup.isOpen,
      windowId: this.windowId,
      results: rawResults,
    });
    const rawResultsClone = JSON.parse(JSON.stringify(rawResults));

    const results = new Results({
      query,
      queriedAt,
      rawResults,
      queryCliqz: this.core.action.bind(this.core, 'queryCliqz'),
      adultAssistant: this.adultAssistant,
      locationAssistant: this.locationAssistant,
      rerender: () => this.dropdown.renderResults(results),
      rawRerender: () => this.render({
        query,
        queriedAt: Date.now(),
        rawResults: rawResultsClone,
      }),
      getSnippet: this.deps.search.action.bind(this.deps.search, 'getSnippet'),
      copyToClipboard,
      updateTabQuery: (q) => {
        const tabId = getCurrentTabId(this.window);
        this.deps['last-query'].windowAction(this.window, 'updateTabQuery', tabId, q);
      },
    });
    const firstResult = results.firstResult;
    let didAutocomplete;

    if (results.isAutocompleteable) {
      didAutocomplete = this.autocompleteQuery(
        firstResult.url,
        firstResult.title,
      );
      firstResult.isAutocompleted = didAutocomplete;
    } else {
      // if no results found make sure we clear autocompleted
      // query in urlbar (see EX-5648)
      this.autocompleteQuery('', '');
    }

    this.dropdown.renderResults(results);

    if (results.results.length) {
      this.popup.open();
    }
  }
}
