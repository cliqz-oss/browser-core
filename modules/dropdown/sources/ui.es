import Renderer from './renderer';
import Popup from './popup';
import events from '../core/events';
import inject from '../core/kord/inject';
import HistoryManager from '../core/history-manager';
import { removeFromHistorySignal } from './telemetry';
import AdultAssistant from './assistants/adult';
import LocationAssistant from './assistants/location';
import { getTabsWithUrl, closeTab } from '../core/tabs';
import Defer from '../core/app/defer';

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
    this._sessionId = 0;
    this.loadingDefer = new Defer();
  }

  _generateSeesionId() {
    this._sessionId = (this._sessionId + 1) % 1000;
  }

  sessionId() {
    return this._sessionId;
  }

  init() {
  }

  unload() {
    this.renderer.unload();
  }

  selectAutocomplete() {
  }

  clearAutocomplete() {
  }

  sessionEnd() {
    this.adultAssistant.resetAllowOnce();
    this.locationAssistant.resetAllowOnce();
    this._generateSeesionId();
  }

  setUrlbarValue = (result) => {
    const optionalArgs = result ? [result.url, { visibleValue: result.urlbarValue }] : [];
    this.renderer.hasAutocompleted = false;
    this.ui.windowAction(this.window, 'setUrlbarValue', ...optionalArgs);
  }

  keyDown(ev) {
    let preventDefault = false;
    const isModifierPressed = ev.altKey || ev.metaKey || ev.ctrlKey;

    // no popup, so no interactions, unless Enter is pressed.
    // report telemetry signal in this case.
    if (!this.renderer.isOpen) {
      // Trigger new search on ArrowDown as some FF versions
      // just reopen last popup (EX-6310, EX-7213).
      if (ev.code === 'ArrowDown' || ev.code === 'ArrowUp') {
        this.core.action('refreshPopup', this.popup.query);
        return true;
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
        this.renderer.previousResult().then(this.setUrlbarValue);
        preventDefault = true;
        break;
      }
      case 'ArrowDown': {
        this.renderer.nextResult().then(this.setUrlbarValue);
        preventDefault = true;
        break;
      }
      case 'Tab': {
        let resultPromise;
        if (ev.shiftKey) {
          resultPromise = this.renderer.previousResult();
        } else {
          resultPromise = this.renderer.nextResult();
        }
        resultPromise.then(this.setUrlbarValue);
        preventDefault = true;
        break;
      }
      case 'Enter':
      case 'NumpadEnter': {
        this.renderer.handleEnter({
          newTab: isModifierPressed,
        });

        preventDefault = true;
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (!ev.shiftKey || ev.metaKey || (ev.altKey && ev.ctrlKey)) {
          break;
        }
        // TODO: @chrmod
        const selectedResult = this.renderer.selectedResult;
        if (!selectedResult.isDeletable) {
          break;
        }

        const historyUrl = selectedResult.historyUrl;
        HistoryManager.removeFromHistory(historyUrl, { strict: false })
          .then(() => {
            removeFromHistorySignal({ withBookmarks: selectedResult.isBookmark });
            if (selectedResult.isBookmark) {
              return HistoryManager.removeFromBookmarks(historyUrl);
            }
            return Promise.resolve();
          })
          .then(() => {
            getTabsWithUrl(this.window, historyUrl).forEach(tab => closeTab(this.window, tab));
            this.core.action('refreshPopup', this.popup.query);
          });

        preventDefault = true;
        break;
      }
      case 'Escape': {
        this.renderer.close();
        break;
      }
      default: {
        preventDefault = false;
      }
    }

    return preventDefault;
  }

  main(element) {
    this.popup = new Popup(this.window);
    this.renderer = new Renderer(element, {
      window: this.window,
      popup: this.popup,
      adultAssistant: this.adultAssistant,
      locationAssistant: this.locationAssistant,
      search: this.deps.search,
    });
    this.renderer.init();
    this.loadingDefer.resolve();
  }

  async render({
    query,
    queriedAt,
    rawResults,
  }) {
    await this.loadingDefer.promise;

    events.pub('ui:results', {
      isPopupOpen: this.popup.isOpen,
      windowId: this.windowId,
      results: rawResults,
    });

    const {
      autocompletion,
    } = await this.renderer.render({
      query,
      queriedAt,
      rawResults,
      getSessionId: () => this._sessionId
    });

    if (autocompletion !== null) {
      this.renderer.hasAutocompleted = this.autocompleteQuery(
        autocompletion.url,
        autocompletion.title,
      );
    }
  }
}
