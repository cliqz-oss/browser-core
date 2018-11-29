import React from 'react';
import Spanan from 'spanan';

export default class SearchSettings extends React.Component {
  state = {
    iframeHeight: 0,
  }

  onMessage = (event) => {
    if (!this.iframeWrapper) {
      return;
    }

    const message = JSON.parse(event.data);

    if (message.target === 'cliqz-control-center') {
      this.iframeWrapper.handleMessage({
        action: message.message.action,
        args: [message.message.data],
      });
    }
  }

  actions = {
    resize: ({ height }) => {
      // TODO moe this to control-center styles
      const controlCenter = this.iframe.contentWindow.document.getElementById('control-center');
      const footer = this.iframe.contentWindow.document.getElementsByClassName('footer')[0];
      controlCenter.style.width = 'auto';
      footer.style.width = 'auto';

      const h = Math.min(height, this.props.maxHeight);
      this.setState({ iframeHeight: h });
    },
  }

  connectIframe = (iframe) => {
    if (!iframe) {
      return;
    }

    this.iframe = iframe;

    const iframeWrapper = new Spanan();

    this.iframeWrapper = iframeWrapper;

    // Somehow the chrome.i18n object is missing on iframes in Chrome
    try {
      // eslint-disable-next-line
      iframe.contentWindow.chrome.i18n = chrome.i18n;
      // eslint-disable-next-line
      iframe.contentWindow.chrome.runtime = chrome.runtime;
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
  }

  render() {
    return (
      <div>
        <div
          className="settings-panel"
        >
          {this.props.isOpen
            && (
              <iframe
                tabIndex="-1"
                src="../control-center/index.html?pageAction=true&compactView=true"
                title="Settings"
                ref={this.connectIframe}
                style={{ height: `${Math.min(this.state.iframeHeight, this.props.maxHeight)}px` }}
              />)
          }
        </div>
      </div>
    );
  }
}
