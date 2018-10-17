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
      showFeedback: false,
      showOffer: true
    };
    this.handleVoucherClick = this.handleVoucherClick.bind(this);
  }

  componentDidMount() {
    offerShowSignal();
  }
  toggleComponents = () => {
    this.setState({
      showOffer: !this.state.showOffer,
      showFeedback: !this.state.showFeedback
    });
  }
  handleVoucherClick() {
    const offer = this.props.offer;
    sendOffersMessage(offer.offer_id, 'offer_ca_action');
    offerClickSignal('use');
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
      <div className={`middle-notification-fluid  ${this.props.fullWidth ? 'full-width' : ''}`}>
        { this.state.showOffer ?
          <div
            className="offer-unit"
            role="button"
            data-id={offer.offer_id}
          >
            <OfferContent
              toggleComponents={this.toggleComponents}
              data={offerTpl}
              offer_id={offerId}
              validity={validity}
              getOfferInfoOpen={this.props.getOfferInfoOpen}
              setOfferInfoOpen={this.props.setOfferInfoOpen}
              getOfferMenuOpen={this.props.getOfferMenuOpen}
              setOfferMenuOpen={this.props.setOfferMenuOpen}
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
              toggleComponents={this.toggleComponents}
            />
          </div>
          :
          null
        }

        { this.state.showOffer ?
          <div className="anzeige">
            {tt('ad_label')}
          </div>
          :
          null
        }

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
