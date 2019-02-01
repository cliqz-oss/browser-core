import React from 'react';

export default class SearchSettings extends React.Component {
  componentDidUpdate(prevProps) {
    if (!prevProps.isOpen && this.props.isOpen) {
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
            src="../control-center/index.html?pageAction=true&compactView=true"
            title="Settings"
            ref={(iframe) => { this.iframe = iframe; }}
          />
        </div>
      </div>
    );
  }
}
