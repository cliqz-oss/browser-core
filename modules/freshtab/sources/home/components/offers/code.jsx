import React from 'react';
import ToggleDisplay from 'react-toggle-display';
import { sendOffersMessage } from '../../services/offers';
import { offerClickSignal } from '../../services/telemetry/offers';
import { tt } from '../../i18n';

export default class Code extends React.Component {
  constructor(props) {
    super(props);
    this.state = Object.freeze({
      show: true
    });
    this.handleClick = this.handleClick.bind(this);
  }

  copyToClipboard() {
    const range = document.createRange();
    range.selectNodeContents(this._code);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
  }

  handleClick() {
    const offer = this.props.offer;
    this.setState({
      show: !this.state.show
    });

    this.copyToClipboard();
    sendOffersMessage(offer.offer_id, 'code_copied');
    offerClickSignal('copy_code');
    setTimeout(() => {
      this.setState({ show: true });
    }, 5000);
  }

  render() {
    return (
      <div>
        <span
          className="code"
          ref={(code) => { this._code = code; }}
        >
          {this.props.data.code}
        </span>
        <span className="divider">&middot;</span>
        <ToggleDisplay show={this.state.show}>
          <span
            role="presentation"
            className="copy-code"
            onClick={this.handleClick}
          >
            {tt('offers-copy-code')}
          </span>
        </ToggleDisplay>
        <ToggleDisplay hide={this.state.show}>
          <span className="code-copied">
            {tt('offers-code-copied')}
          </span>
        </ToggleDisplay>
      </div>
    );
  }
}
