/* global $ */
/* global window */
/* global document */
import React from 'react';
import ReactTooltip from 'react-tooltip';
import PropTypes from 'prop-types';
import cliqz from '../cliqz';
import t from '../i18n';
import { sendOffersMessage } from '../services/offers';

import { offerShowSignal, offerClickSignal } from '../services/telemetry/offers';

function Code(props) {
  if (props.code) {
    return (
      <div className="code">
        {props.code}
      </div>
    );
  }

  return '';
}

export default class Offer extends React.Component {
  constructor(props) {
    super(props);
    this.handleVoucherClick = this.handleVoucherClick.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);
  }

  handleVoucherClick() {
    const offer = this.props.offer;
    sendOffersMessage(offer.offer_id, 'offer_ca_action');
    offerClickSignal('use');
  }

  handleCloseClick() {
    const offer = this.props.offer;
    const offerId = offer.offer_id;

    cliqz.storage.setState(state => ({
      offers: state.offers.filter(res => res.offer_id !== offerId),
    }));

    sendOffersMessage(offerId, 'offer_removed', 'remove-offer');
    offerClickSignal('remove');
  }

  get domain() {
    const offerTpl = this.props.offer.offer_info.ui_info.template_data;
    return offerTpl.call_to_action.url.match('^(?:https?:)?(?://)?(?:[^@\n]+@)?(?:www.)?([^:/\n]+)')[1];
  }

  get anchorClasses() {
    const offerTpl = this.props.offer.offer_info.ui_info.template_data;
    return [
      'cta-btn',
      offerTpl.call_to_action.text.length > 13 ? 'small-font' : '',
    ].join(' ');
  }

  render() {
    const offer = this.props.offer;
    const offerTpl = this.props.offer.offer_info.ui_info.template_data;
    offerShowSignal();


    return (
      /* eslint-disable jsx-a11y/no-static-element-interactions */
      <div
        className="offer-middle-notification middle-notification-box notification"
        role="button"
        data-id={offer.offer_id}
      >
        <button
          className="close"
          onClick={this.handleCloseClick}
        />
        <div className="offer-icon">
          <img src={offerTpl.logo_url} alt="" />
        </div>
        <div className="content">

          <div className="action-wrapper">
            <div className="tooltip-holder">
              <span
                className="tooltip"
                ref={(el) => { this.tooltip = el; }}
                data-tip={offerTpl.conditions}
              >
                {t('app.offer.info')}
              </span>
            </div>

            <span className="offer-domain">
              { this.domain }
            </span>

            <a
              href={offerTpl.call_to_action.url}
              className={this.anchorClasses}
              target="_blank"
              rel="noopener noreferrer"
              onClick={this.handleVoucherClick}
            >
              <span>
                {offerTpl.call_to_action.text}
              </span>
            </a>
          </div>

          <h1>
            {offerTpl.title}
          </h1>
          <p className="offer-description">
            {offerTpl.desc}
          </p>
          <Code code={offerTpl.code} />
        </div>
        <ReactTooltip afterShow={() => { sendOffersMessage(offer.offer_id, 'offer_more_info'); }} />
      </div>
      /* eslint-enable jsx-a11y/no-static-element-interactions */
    );
  }
}

Offer.propTypes = {
  offer: PropTypes.shape({
    offer_info: PropTypes.shape({
      ui_info: PropTypes.shape({
        template_data: PropTypes.shape({})
      })
    })
  })
};

Code.propTypes = PropTypes.shape({});
