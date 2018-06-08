import Spanan from 'spanan';
import config from '../core/config';
import events from '../core/events';
import utils from '../core/utils';
import { cleanMozillaActions } from '../core/url';
import { copyToClipboard } from '../core/clipboard';
import * as offersAssistant from './assistants/offers';
import settingsAssistant from './assistants/settings';
import { getCurrentTabId } from '../core/tabs';
import ContextMenu from './context-menu';

const NO_AUTOCOMPLETE = {
  autocompletion: null,
};

export default class {
  actions = {
    telemetry: utils.telemetry,
    openLink: (
      url,
      {
        newTab,
        eventType,
        eventOptions: {
          type: eventArgType,
          ...eventArgOptions,
        },
        result,
        resultOrder,
      },
    ) => {
      const Event = eventType === 'mouse' ? this.window.MouseEvent : this.window.KeyboardEvent;
      const event = new Event(eventArgType, eventArgOptions);
      let href = url;

      if (newTab) {
        const [action, originalUrl] = cleanMozillaActions(href);
        if (action === 'switchtab') {
          href = originalUrl;
        }
      }

      events.pub('ui:click-on-url', {
        url: href,
        query: result.query,
        rawResult: result,
        resultOrder,
        isNewTab: Boolean(newTab),
        isPrivateMode: utils.isPrivateMode(this.window),
        isPrivateResult: utils.isPrivateResultType(result.kind),
        isFromAutocompletedURL: this.hasAutocompleted && eventType === 'keyboard',
        windowId: utils.getWindowID(this.window),
        tabId: getCurrentTabId(this.window),
        action: eventType === 'keyboard' ? 'enter' : 'click',
      });

      let value;
      let selectionStart;
      let selectionEnd;

      if (newTab) {
        value = this.popup.urlbar.mInputField.value;
        selectionStart = this.popup.urlbar.mInputField.selectionStart;
        selectionEnd = this.popup.urlbar.mInputField.selectionEnd;

        // setting the flag to ignore the next blur event
        this.popup.urlbar.cliqzFocused = true;
      }

      this.popup.execBrowserCommandHandler(href, event, newTab ? 'tabshifted' : 'current');

      if (newTab) {
        this.popup.urlbar.mInputField.value = value;
        this.popup.urlbar.mInputField.selectionStart = selectionStart;
        this.popup.urlbar.mInputField.selectionEnd = selectionEnd;

        this.popup.urlbar.focus();
        this.popup.urlbar.cliqzFocused = false;
      } else {
        this.close();
      }
    },
    reportSelection: (result) => {
      events.pub('dropdown:result-selected', {
        windowId: utils.getWindowID(this.window),
        tabId: getCurrentTabId(this.window),
        selectedIndex: result.index,
      });
      this.selectedResult = result;
    },
    copyToClipboard,
    setHeight: (height) => {
      this.setHeight(height);
    },
    adultAction: (actionName) => {
      if (this.adultAssistant.hasAction(actionName)) {
        this.adultAssistant[actionName]();
        this.render({
          query: this.previousQuery,
          rawResults: this.previousRawResults,
          queriedAt: Date.now(),
          getSessionId: this.getSessionId,
        });
      }
    },
    locationAction: async (actionName, query, rawResult) => {
      if (this.locationAssistant.hasAction(actionName)) {
        await this.locationAssistant[actionName]();
        const snippet = await this.search.action('getSnippet', query, rawResult);
        return {
          snippet,
          locationState: this.locationAssistant.getState(),
        };
      }
      return null;
    },
    openContextMenu: (subresult, { x, y }) => {
      this.contextMenu.show(subresult, { x, y });
    },
  };

  constructor(parentElement, {
    popup,
    window,
    adultAssistant,
    locationAssistant,
    search,
  }) {
    this.hasAutocompleted = false;
    this.parentElement = window.document.getElementById('navigator-toolbox');
    this.window = window;
    this.popup = popup;
    this.adultAssistant = adultAssistant;
    this.locationAssistant = locationAssistant;
    this.search = search;
  }

  get document() {
    return this.parentElement.ownerDocument;
  }

  get navbarColor() {
    const CHANNEL_TRESHOLD = 220;
    const toolbar = this.window.document.getElementById('nav-bar');
    const bgColor = this.window.getComputedStyle(toolbar)['background-color'];

    // Check if toolbar background color is light-grey-ish and non-transparent
    const [, r, g, b, a] = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?/) || ['', '0', '0', '0', '0'];
    if (r > CHANNEL_TRESHOLD &&
        g > CHANNEL_TRESHOLD &&
        b > CHANNEL_TRESHOLD &&
       (a === undefined || a >= 1)
    ) {
      return bgColor;
    }
    return null;
  }

  init() {
    const cliqzToolbar = this.document.createElement('toolbar');
    cliqzToolbar.id = 'cliqz-toolbar';
    cliqzToolbar.style.height = '0px';
    this.toolbar = cliqzToolbar;

    const container = this.document.createElement('div');

    const iframe = this.document.createElement('browser');
    iframe.setAttribute('id', 'cliqz-popup');
    iframe.setAttribute('type', 'content');
    iframe.setAttribute('flex', '1');
    iframe.setAttribute('ignorekeys', 'false');
    iframe.setAttribute('src', `${config.baseURL}dropdown/dropdown.html`);
    iframe.style.MozUserFocus = 'ignore';

    container.appendChild(iframe);

    cliqzToolbar.appendChild(container);

    const navToolbar = this.document.getElementById('nav-bar');
    this.parentElement.insertBefore(cliqzToolbar, navToolbar.nextSibling);

    this.iframe = iframe;

    const iframeWrapper = new Spanan(({ action, ...rest }) => {
      iframe.contentWindow.postMessage({
        target: 'cliqz-dropdown',
        action,
        ...rest,
      }, '*');
    });

    iframe.addEventListener('DOMContentLoaded', () => {
      iframe.contentWindow.addEventListener('message', (event) => {
        const message = event.data;

        if (message.type === 'response') {
          iframeWrapper.dispatch({
            uuid: message.uuid,
            response: message.response,
          });
          return;
        }

        if (message.target === 'cliqz-renderer') {
          iframeWrapper.handleMessage(message);
        }
      });
    });

    iframeWrapper.export(this.actions, {
      respond(response, request) {
        iframe.contentWindow.postMessage({
          type: 'response',
          uuid: request.uuid,
          response,
        }, '*');
      },
    });

    this.dropdownAction = iframeWrapper.createProxy();

    this.contextMenu = new ContextMenu(this.window, this.parentElement);
  }

  unload() {
    this.parentElement.removeChild(this.toolbar);
  }

  nextResult() {
    return this.dropdownAction.nextResult();
  }

  previousResult() {
    return this.dropdownAction.previousResult();
  }

  get maxHeight() {
    return this.window.innerHeight - 140;
  }

  get isOpen() {
    return this.height > 0;
  }

  setHeight(height) {
    this.height = height;
    const newHeight = Math.min(this.maxHeight, height);
    const heightInPx = `${newHeight}px`;

    this.iframe.style.height = heightInPx;

    // Request popup's dimensions in order to force its repaint.
    // Fixes weird rendering issues on retina in FF 60. Return value is not used.

    // TODO: @chrmod
    return this.popup.element.scrollHeight;
  }

  handleEnter({ newTab }) {
    return this.dropdownAction.handleEnter({ newTab });
  }

  hasRelevantResults(query, rawResults) {
    return rawResults.length && rawResults.some(result =>
      (result.text && (result.text.trim() === query.trim())) ||
      (result.suggestion && (result.suggestion.trim() === query.trim())));
  }

  close() {
    this.popup.close();
    this.iframe.classList.add('dropdown-hidden');
    this.setHeight(0);
    this.dropdownAction.clear();
  }

  open() {
    this.iframe.classList.remove('dropdown-hidden');
    this.popup.open();
  }

  async render({
    query,
    queriedAt,
    rawResults,
    getSessionId,
  }) {
    this.hasAutocompleted = false;
    this.previousQuery = query;
    this.previousRawResults = rawResults;
    this.getSessionId = getSessionId;

    // We should not even attempt to render irrelevant results
    if (!this.hasRelevantResults(query, rawResults)) {
      if (query === '') {
        this.close();
      }
      return NO_AUTOCOMPLETE;
    }

    const {
      height,
      autocompletion,
      result,
      renderedSessionId,
    } = await this.dropdownAction.render({
      rawResults,
      query,
      queriedAt,
      sessionId: getSessionId(),
      navbarColor: this.navbarColor,
    }, {
      assistantStates: {
        adult: this.adultAssistant.getState(),
        location: this.locationAssistant.getState(),
        offers: offersAssistant.getState(),
        settings: settingsAssistant.getState(),
      },
      urlbarAttributes: this.popup.getUrlbarAttributes(),
      maxHeight: this.maxHeight,
    });
    this.selectedResult = result;
    this.setHeight(height);

    // While we were rendering results the query or search session may have changed.
    // So we have to check if rendered results are still relevant to the current query
    // and that we are still in the same session.
    if (renderedSessionId === getSessionId() &&
        this.hasRelevantResults(this.popup.query, rawResults)) {
      this.open();
      return {
        autocompletion,
      };
    }

    if (renderedSessionId !== getSessionId() || this.popup.query === '') {
      this.close();
    }
    this.selectedResult = null;
    return NO_AUTOCOMPLETE;
  }
}
