import React from 'react';
import Spanan from 'spanan';

import Urlbar from './index';
import SearchSettings from './search-settings';
import cliqz from '../../cliqz';

export default class UrlbarWithResults extends Urlbar {
  actions = {
    openLink: (
      url,
      {
        newTab,
        eventType,
        result,
        resultOrder,
        meta = {},
      },
    ) => {
      const selection = {
        url,
        query: result.query,
        rawResult: result,
        resultOrder,
        isNewTab: Boolean(newTab),
        isPrivateMode: false,
        kind: result.kind,
        isFromAutocompletedURL: this.hasAutocompleted && eventType === 'keyboard',
        action: eventType === 'keyboard' ? 'enter' : 'click',
        elementName: meta.elementName,
      };

      cliqz.freshtab.selectResult(selection);

      window.location.href = url;
    },
    setHeight: (height) => {
      this.setHeight(height);
    },
    focus: () => {
      this.textInput.focus();
      this.setState({
        isBlurScheduled: false,
      });
    },
    reportHighlight: () => {
      cliqz.search.reportHighlight();
    },
    adultAction: (actionName) => {
      cliqz.search.adultAction(actionName)
        .then(() => {
          this._render(this.previousResults);
        });
    },
    locationAction: (actionName, query, rawResult) =>
      cliqz.search.locationAction(actionName, query, rawResult),
  }

  get classes() {
    return [
      super.classes,
      'with-results',
    ].join(' ');
  }

  get maxHeight() {
    return window.innerHeight - 140;
  }

  setHeight(height) {
    if (!this.iframe) {
      return;
    }

    const newHeight = Math.min(this.maxHeight, height);
    const heightInPx = `${newHeight}px`;
    this.iframe.style.height = heightInPx;
  }

  nextResult() {
    return this.dropdownAction.nextResult();
  }

  previousResult() {
    return this.dropdownAction.previousResult();
  }

  setUrlbarValue = (result) => {
    if (result.completion) {
      this.autocompleteQuery(result.query, result.completion);
    } else {
      this.textInput.value = result.urlbarValue;
    }
  }


  handleKeyDown = (ev) => {
    this.lastEvent = {
      code: ev.key,
    };

    switch (ev.key) {
      case 'ArrowUp': {
        this.previousResult().then(this.setUrlbarValue);
        break;
      }
      case 'ArrowDown': {
        this.nextResult().then(this.setUrlbarValue);
        break;
      }
      case 'Tab': {
        if (!this.textInput.value) {
          break;
        }

        let resultPromise;
        if (ev.shiftKey) {
          resultPromise = this.previousResult();
        } else {
          resultPromise = this.nextResult();
        }
        ev.preventDefault();
        resultPromise.then(this.setUrlbarValue);
        break;
      }
      case 'Enter': {
        this.dropdownAction.handleEnter({});
        break;
      }
      case 'Escape': {
        this.setHeight(0);
        break;
      }
      default: break;
    }
  }

  handleInput = () => {
    const query = this.textInput.value;

    if (query) {
      cliqz.search.startSearch(query, { key: this.lastEvent.code });
    }
  }

  async _render(results) {
    const firstResult = results && results[0];
    if (!firstResult) {
      if (this.textInput && !this.textInput.value) {
        this.setHeight(0);
      }
      return;
    }

    const assistantStates = await cliqz.search.getAssistantStates();
    const query = firstResult.text;
    const queriedAt = Date.now();

    this.previousQuery = query;
    this.previousResults = results;

    const {
      height,
      result,
    } = await this.dropdownAction.render({
      rawResults: results,
      query,
      queriedAt,
    }, {
      assistantStates,
      urlbarAttributes: {
        padding: 35
      },
      maxHeight: this.maxHeight,
    });

    this.autocompleteQuery(
      query,
      firstResult.meta.completion,
    );

    this.selectedResult = result;
    this.setHeight(height);
  }

  async componentWillReceiveProps(props) {
    if (!this.iframe) {
      return;
    }

    this._render(props.results);
  }

  autocompleteQuery(query, completion) {
    if (!completion) {
      return;
    }

    const value = `${query}${completion}`;

    this.textInput.value = value;

    this.textInput.setSelectionRange(query.length, value.length);
  }

  onMessage = (event) => {
    if (!this.iframeWrapper) {
      return;
    }

    const message = event.data;

    if (message.type === 'response') {
      this.iframeWrapper.dispatch({
        uuid: message.uuid,
        response: message.response,
      });
      return;
    }

    if (message.target === 'cliqz-renderer') {
      this.iframeWrapper.handleMessage(message);
    }
  }

  createIframeWrapper = (iframe) => {
    if (!iframe) {
      return;
    }

    this.iframe = iframe;

    const iframeWrapper = new Spanan(({ action, ...rest }) => {
      iframe.contentWindow.postMessage({
        target: 'cliqz-dropdown',
        action,
        ...rest,
      }, '*');
    });

    this.iframeWrapper = iframeWrapper;

    // Somehow the chrome.i18n object is missing on iframes in Chrome
    try {
      // eslint-disable-next-line
      iframe.contentWindow.chrome.i18n = chrome.i18n;
    } catch (e) {
      // throws on platform firefox, but i18n is there already
    }

    iframe.contentWindow.addEventListener('message', this.onMessage);

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
  }

  componentWillUnmount() {
    this.iframe.contentWindow.removeEventListener('message', this.onMessage);
  }

  handleFocus = () => {
    this.props.toggleOverlay();
  }

  handleBlur = () => {
    cliqz.search.stopSearch();
    this.setState({
      isBlurScheduled: true,
    });

    cliqz.search.resetAssistantStates();
    this.props.toggleOverlay();

    setTimeout(() => {
      if (!this.state.isBlurScheduled) {
        return;
      }
      this.setHeight(0);
      this.setState({
        isBlurScheduled: false,
      });
    }, 200);
  }

  _queryCliqz() {

  }

  render() {
    return (
      <div>
        {super.render()}
        <div className="inner-container">
          <SearchSettings
            showOverlay={this.props.showOverlay}
            hideOverlay={this.props.hideOverlay}
          />
          <div className="results">
            <iframe
              id="cliqz-dropdown"
              tabIndex="-1"
              title="Results"
              ref={this.createIframeWrapper}
              src="../dropdown/dropdown.html"
            />
          </div>
        </div>
      </div>
    );
  }
}
