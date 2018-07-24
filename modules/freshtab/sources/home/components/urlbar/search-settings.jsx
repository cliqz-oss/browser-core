import React from 'react';
import Spanan from 'spanan';
import cliqz from '../../cliqz';

export default class SearchSettings extends React.Component {
  constructor() {
    super();
    this.state = {
      show: false
    };
  }

  componentWillUnmount() {
    this.iframe.contentWindow.removeEventListener('message', this.onMessage);
  }

  onMessage = (event) => {
    if (!this.iframeWrapper) {
      return;
    }

    const message = JSON.parse(event.data);

    if (message.type === 'response') {
      this.iframeWrapper.dispatch({
        uuid: message.uuid,
        response: message.response,
      });
      return;
    }

    if (message.target === 'cliqz-control-center') {
      this.iframeWrapper.handleMessage({
        action: message.message.action,
        args: [message.message.data],
      });
    }
  }

  actions = {
    getEmptyFrameAndData: async () => {
      const status = await cliqz.controlCenter.status();
      this.action.pushData({
        ...status,
        compactView: true,
      });
    },
    resize: ({ height }) => {
      this.iframe.style.height = `${height}px`;
      const controlCenter = this.iframe.contentWindow.document.getElementById('control-center');
      const footer = this.iframe.contentWindow.document.getElementsByClassName('footer')[0];
      controlCenter.style.width = 'auto';
      footer.style.width = 'auto';
    },
    updatePref: (ev) => {
      cliqz.controlCenter.updatePref(ev);
    },
    'complementary-search': () => {
    },
    'search-index-country': (ev) => {
      cliqz.controlCenter.searchIndexCountry(ev);
    }
  }

  createIframeWrapper = (iframe) => {
    if (!iframe) {
      return;
    }

    this.iframe = iframe;

    const iframeWrapper = new Spanan(({ action, args }) => {
      iframe.contentWindow.postMessage(JSON.stringify({
        target: 'cliqz-control-center',
        origin: 'window',
        message: {
          action,
          data: args[0],
        },
      }), '*');
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
        iframe.contentWindow.postMessage(JSON.stringify({
          type: 'response',
          uuid: request.uuid,
          response,
        }), '*');
      },
    });

    this.action = iframeWrapper.createProxy();
  }

  handleClick = () => {
    this.setState({
      show: !this.state.show
    });

    const isOpen = this.state.show;
    if (isOpen) {
      this.props.hideOverlay();
    } else {
      this.props.showOverlay();
    }
  }

  render() {
    return (
      <div>
        <div
          className={`settings-panel ${(this.state.show ? 'open' : 'closed')}`}
        >
          <iframe
            tabIndex="-1"
            src="../control-center/index.html?pageAction=true"
            title="Settings"
            ref={this.createIframeWrapper}
          />
        </div>
        <button
          className="search-settings-btn"
          tabIndex="-1"
          onClick={this.handleClick}
        />
      </div>
    );
  }
}

