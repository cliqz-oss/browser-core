import React from 'react';
import Spanan from 'spanan';

import Urlbar from './urlbar';
import cliqz from '../cliqz';

export default class UrlbarWithResults extends Urlbar {
  actions = {
    openLink: (
      url,
    ) => {
      window.location.href = url;
    },
    setHeight: (height) => {
      this.setHeight(height);
    },
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

  handleKeyDown = (ev) => {
    switch (ev.key) {
      case 'ArrowUp': {
        this.previousResult();
        break;
      }
      case 'ArrowDown': {
        this.nextResult();
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
      cliqz.search.startSearch(query);
    }
  }

  async componentWillReceiveProps(props) {
    if (!this.iframe) {
      return;
    }

    const firstResult = props.results && props.results[0];
    if (!firstResult) {
      if (this.textInput && !this.textInput.value) {
        this.setHeight(0);
      }
      return;
    }

    const {
      height,
      result,
    } = await this.dropdownAction.render({
      rawResults: props.results,
      query: firstResult.text,
      queriedAt: Date.now(),
    }, {
      assistantStates: {
        adult: {},
        location: {},
        offers: {},
        settings: {},
      },
      padding: 50,
      maxHeight: this.maxHeight,
    });

    this.selectedResult = result;
    this.setHeight(height);
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

  render() {
    return (
      <div>
        {super.render()}
        <div className="results">
          <iframe
            title="Results"
            ref={this.createIframeWrapper}
            src="../dropdown/dropdown.html"
          />
        </div>
      </div>
    );
  }
}
