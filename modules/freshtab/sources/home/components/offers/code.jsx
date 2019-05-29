import React from 'react';
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

    this.setState(prevState => ({ show: !prevState.show }));

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
        {this.state.show
          ? (
            <span
              role="presentation"
              className="copy-code"
              onClick={this.handleClick}
            >
              {tt('offers_copy_code')}
            </span>
          )
          : (
            <span className="code-copied">
              {tt('offers_code_copied')}
            </span>
          )
        }
      </div>
    );
  }
}
