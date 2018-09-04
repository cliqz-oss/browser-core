import Renderer from './renderer';
import inject from '../core/kord/inject';
import HistoryManager from '../core/history-manager';
import { removeFromHistorySignal } from './telemetry';
import { getTabsWithUrl, closeTab } from '../core/tabs';
import Defer from '../core/helpers/defer';

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
    this.main();
  }

  unload() {
    this.renderer.unload();
  }

  sessionEnd() {
    this.deps.search.action('resetAssistantStates');
    this._generateSeesionId();
  }

  setUrlbarValue = (result) => {
    const optionalArgs = result ? [result.url, { visibleValue: result.urlbarValue }] : [];
    this.renderer.hasAutocompleted = false;
    if (result.completion) {
      this.renderer.autocompleteQuery(result.query, result.completion);
    } else {
      this.ui.windowAction(this.window, 'setUrlbarValue', ...optionalArgs);
    }
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
        this.core.action('refreshPopup', this.renderer.query);
        return true;
      }

      if (ev.code !== 'Enter' && ev.code !== 'NumpadEnter') {
        return false;
      }
    }

    switch (ev.code) {
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
            this.core.action('refreshPopup', this.renderer.query);
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

  main() {
    this.renderer = new Renderer({
      window: this.window,
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

    await this.renderer.render({
      query,
      queriedAt,
      rawResults,
      getSessionId: () => this._sessionId
    });
  }
}
