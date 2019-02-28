import React from 'react';

export default class SearchSettings extends React.Component {
  loadSettingsIframe() {
    if (this.iframe.src) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.iframe.onload = () => {
        this.iframe.contentWindow.addEventListener('message', resolve, { once: true });
      };
      this.iframe.src = '../control-center/index.html?pageAction=true&compactView=true';
    });
  }

  async componentDidUpdate(prevProps) {
    if (!prevProps.isOpen && this.props.isOpen) {
      await this.loadSettingsIframe();
      const controlCenter = this.iframe.contentWindow.document.getElementById('control-center');
      controlCenter.style.width = 'auto';
      controlCenter.querySelector('.footer').style.width = 'auto';
      this.iframe.style.height = `${Math.min(controlCenter.scrollHeight, this.props.maxHeight)}px`;
    }
  }

  render() {
    return (
      <div>
        <div
          className="settings-panel"
        >
          <iframe
            tabIndex="-1"
            title="Settings"
            ref={(iframe) => { this.iframe = iframe; }}
          />
        </div>
      </div>
    );
  }
}
