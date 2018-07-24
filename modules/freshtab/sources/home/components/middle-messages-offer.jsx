import React from 'react';
import ReactTooltip from 'react-tooltip';
import PropTypes from 'prop-types';
import { tt } from '../i18n';
import { sendOffersMessage } from '../services/offers';
import OfferContent from './offers/content';
import OfferFooter from './offers/footer';
import OfferFeedback from './offers/offer-feedback';

import { offerShowSignal, offerClickSignal } from '../services/telemetry/offers';

export default class Offer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showOffer: true,
      showFeedback: false
    };
    this.handleVoucherClick = this.handleVoucherClick.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);
  }

  componentDidMount() {
    offerShowSignal();
  }

  handleVoucherClick() {
    const offer = this.props.offer;
    sendOffersMessage(offer.offer_id, 'offer_ca_action');
    offerClickSignal('use');
  }

  handleCloseClick() {
    const offer = this.props.offer;
    const offerId = offer.offer_id;

    this.setState({
      showOffer: false,
      showFeedback: true
    });

    sendOffersMessage(offerId, 'offer_removed', 'remove-offer');
    offerClickSignal('remove');
  }

  get domain() {
    const offerTpl = this.props.offer.offer_info.ui_info.template_data;
    return offerTpl.call_to_action.url.match('^(?:https?:)?(?://)?(?:[^@\n]+@)?(?:www.)?([^:/\n]+)')[1];
  }

  render() {
    const offer = this.props.offer;
    const offerTpl = this.props.offer.offer_info.ui_info.template_data;
    const offerId = offer.offer_id;
    const validity = offer.validity;
    return (
      /* eslint-disable jsx-a11y/no-static-element-interactions */
      <div className="middle-notification-box offer">
        { this.state.showOffer ?
          <div
            className="offer-middle-notification notification offer-container"
            role="button"
            data-id={offer.offer_id}
          >
            <button
              className="close"
              onClick={this.handleCloseClick}
            />
            <OfferContent
              data={offerTpl}
              offer_id={offerId}
              validity={validity}
            />
            <OfferFooter
              data={offerTpl}
              offer={this.props.offer}
              handleVoucherClick={this.handleVoucherClick}
            />
            <ReactTooltip afterShow={() => { sendOffersMessage(offer.offer_id, 'offer_more_info'); }} />
          </div>
          :
          null
        }

        { this.state.showFeedback ?
          <div>
            <OfferFeedback
              submitFeedbackForm={this.props.submitFeedbackForm}
              offer_id={offer.offer_id}
            />
          </div>
          :
          null
        }

        <div className="anzeige">
          {tt('ad_label')}
        </div>
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
