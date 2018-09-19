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
      'footer-cta',
      offerTpl.call_to_action.text.length > 13 ? 'small-font' : '',
    ].join(' ');
  }

  handleHover() {
    offerHoverSignal('conditions');
  }

  render() {
    return (
      <footer>
        <div className="left-container">
          <Code
            data={this.props.data}
            offer={this.props.offer}
          />
        </div>
        <div className="right-container">
          {this.props.data.conditions &&
            <span>
              <span
                className="tooltip condition-label"
                ref={(el) => { this.tooltip = el; }}
                data-tip={this.props.data.conditions}
                onMouseOver={this.handleHover}
              >
                {t('app_conditions')}
              </span>
              <img
                className="info-icon tooltip tooltipstered"
                ref={(el) => { this.tooltip = el; }}
                data-tip={this.props.data.conditions}
                src="./images/info-icon-hover.svg"
                alt={t('app_conditions')}
                onMouseOver={this.handleHover}
              />
            </span>
          }
          <a
            href={this.props.data.call_to_action.url}
            className={this.anchorClasses}
            rel="noreferrer noopener"
            target="_blank"
            onClick={this.props.handleVoucherClick}
          >
            {this.props.data.call_to_action.text}
          </a>
        </div>
      </footer>
    );
  }
}
