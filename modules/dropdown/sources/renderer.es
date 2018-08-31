import Spanan from 'spanan';
import config from '../core/config';
import events from '../core/events';
import utils from '../core/utils';
import { cleanMozillaActions } from '../core/url';
import { copyToClipboard } from '../core/clipboard';
import { getCurrentTabId } from '../core/tabs';
import ContextMenu from './context-menu';

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
        meta = {},
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
        elementName: meta.elementName,
      });

      let value;
      let selectionStart;
      let selectionEnd;

      if (newTab) {
        value = this.urlbar.mInputField.value;
        selectionStart = this.urlbar.mInputField.selectionStart;
        selectionEnd = this.urlbar.mInputField.selectionEnd;

        // setting the flag to ignore the next blur event
        this.urlbar.cliqzFocused = true;
      }

      this.urlbar.value = href;
      this.urlbar.handleCommand(event, newTab ? 'tabshifted' : 'current');

      if (newTab) {
        this.urlbar.mInputField.value = value;
        this.urlbar.mInputField.selectionStart = selectionStart;
        this.urlbar.mInputField.selectionEnd = selectionEnd;

        this.urlbar.focus();
        this.urlbar.cliqzFocused = false;
      } else {
        this.close();
      }
    },
    reportHighlight: (result) => {
      events.pub('dropdown:result-highlight', {
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
      this.search.action('adultAction', actionName)
        .then(() => {
          this.render({
            query: this.previousQuery,
            rawResults: this.previousRawResults,
            queriedAt: Date.now(),
            getSessionId: this.getSessionId,
          });
        });
    },
    locationAction: (actionName, query, rawResult) =>
      this.search.action('locationAction', actionName, query, rawResult),
    openContextMenu: (subresult, { x, y }) => {
      this.contextMenu.show(subresult, { x, y });
    },
  };

  constructor({
    window,
    search,
  }) {
    this.hasAutocompleted = false;
    this.parentElement = window.document.getElementById('navigator-toolbox');
    this.window = window;
    this.search = search;
  }

  get urlbar() {
    return this.window.gURLBar;
  }

  get query() {
    // TODO: should this rather return this.previousQuery ?
    const ctrl = this.urlbar.controller;
    return ctrl.searchString;
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
    iframe.tabIndex = -1;
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
    return height;
  }

  handleEnter = async ({ newTab }) => {
    if (
      this.isOpen && (
        newTab ||
        this.hasRelevantResults(this.query, this.selectedResult ? [this.selectedResult] : [])
      )
    ) {
      return this.dropdownAction.handleEnter({ newTab });
    }

    const handledQuery = await this.search.action('queryToUrl', this.query);

    events.pub('ui:enter', {
      isPrivateMode: utils.isPrivateMode(this.window),
      windowId: utils.getWindowID(this.window),
      tabId: getCurrentTabId(this.window),
      query: this.query,
    });

    /* If a user did not type anything in
    *  a searchbar then we should not allow
    *  to handle enter command.
    *  Otherwise a browser will try to delegate
    *  it to its' default search engine.
    */
    if (!this.query) {
      return false;
    }

    /* Here we need to set a value to urlbar.
     * This value will be handled by handleCommand FF method.
     * In our case handledQuery might be
     * moz-action:searchengine... or
     * moz-action:visiturl...
     * Searchengine occurs if a user requests something
     * other than a valid URL, 'best place in the world', for example.
     * handleCommand then uses default search engine set
     * in a browser to look for results.
     * If a user types something that looks like a valid
     * url then visiturl marker takes place and FF
     * knows that it needs to load that page instead of
     * using a default search engine.
     * */
    this.urlbar.value = handledQuery;
    return this.urlbar.handleCommand();
  }

  hasRelevantResults(query, rawResults) {
    return (
      rawResults.length &&
      rawResults.some(
        result =>
          (result.text === query) ||
          (result.suggestion && (result.suggestion === query))
      )
    );
  }

  close() {
    this.iframe.classList.add('dropdown-hidden');
    this.setHeight(0);
    this.dropdownAction.clear();
  }

  open() {
    this.iframe.classList.remove('dropdown-hidden');
  }

  autocompleteQuery(query, completion) {
    if (!completion) {
      if ((this.previousQuery === query) && (this.urlbar.mInputField.value !== query)) {
        // urlbar for some reason contains old query,
        // that is probably due to race condition of user input and
        // previous call to autocompleteQuery, we fix it to most resent value
        this.urlbar.mInputField.value = query;
      }
      return;
    }
    const value = `${query}${completion}`;

    this.urlbar.mInputField.value = value;

    this.urlbar.setSelectionRange(query.length, value.length);

    this.hasAutocompleted = true;
  }

  getUrlbarAttributes() {
    const urlbarRect = this.urlbar.getBoundingClientRect();
    const urlbarLeftPos = Math.round(urlbarRect.left || urlbarRect.x || 0);
    const urlbarWidth = urlbarRect.width;
    const extraPadding = 10;
    let contentPadding = extraPadding + urlbarLeftPos;

    // Reset padding when there is a big space on the left of the urlbar
    // or when the browser's window is too narrow
    if (contentPadding > 500 || this.window.innerWidth < 650) {
      contentPadding = 50;
    }

    return {
      padding: contentPadding,
      left: urlbarLeftPos,
      width: urlbarWidth,
    };
  }

  // TODO: reuse core/dropdown/base
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
    }

    const assistantStates = await this.search.action('getAssistantStates');

    const {
      height,
      result,
      renderedSessionId,
    } = await this.dropdownAction.render({
      rawResults,
      query,
      queriedAt,
      sessionId: getSessionId(),
      navbarColor: this.navbarColor,
    }, {
      assistantStates,
      urlbarAttributes: this.getUrlbarAttributes(),
      maxHeight: this.maxHeight,
    });
    this.selectedResult = result;
    this.setHeight(height);

    // While we were rendering results the query or search session may have changed.
    // So we have to check if rendered results are still relevant to the current query
    // and that we are still in the same session.
    if (result && renderedSessionId === getSessionId() &&
        this.hasRelevantResults(this.query, [result])) {
      this.open();

      this.autocompleteQuery(
        query,
        result.meta.completion,
      );
      return;
    }

    if (renderedSessionId !== getSessionId() || this.query === '') {
      this.close();
    }
    this.selectedResult = null;
  }
}
