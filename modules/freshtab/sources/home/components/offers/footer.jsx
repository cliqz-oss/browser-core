import React from 'react';
import Code from './code';
import { offerHoverSignal } from '../../services/telemetry/offers';
import t from '../../i18n';

export default class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.handleHover = this.handleHover.bind(this);
  }
  get anchorClasses() {
    const offerTpl = this.props.data;
    return [
      'cta-btn',
      offerTpl.call_to_action.text.length > 13 ? 'small-font' : '',
    ].join(' ');
  }

  handleHover() {
    offerHoverSignal('conditions');
  }

  render() {
    return (
      <div className="footer flex-container">
        <Code
          data={this.props.data}
          offer={this.props.offer}
        />
        <div className="right-container">
          <span
            className="tooltip"
            ref={(el) => { this.tooltip = el; }}
            data-tip={this.props.data.conditions}
            onMouseOver={this.handleHover}
          >
            {t('app.conditions')}
          </span>
          <img
            className="info-icon tooltip tooltipstered"
            ref={(el) => { this.tooltip = el; }}
            data-tip={this.props.data.conditions}
            src="./images/info-icon-hover.svg"
            alt={t('app.conditions')}
            onMouseOver={this.handleHover}
          />
          <a
            href={this.props.data.call_to_action.url}
            className={this.anchorClasses}
            target="_blank"
            onClick={this.props.handleVoucherClick}
          >
            <span>
              {this.props.data.call_to_action.text}
            </span>
          </a>
        </div>
      </div>
    );
  }
}

