/* global window */
import React from 'react';
import PropTypes from 'prop-types';
import Offer from './middle-messages-offer';
import { sendOffersMessage, sendOfferShownMessage } from '../services/offers';

export default class MiddleMessagesOffer extends React.Component {
  constructor(...args) {
    super(...args);

    this.handleScroll = this.handleScroll.bind(this);
    this.scrollFinished = this.scrollFinished.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);

    this.shownOffers = {};
    this.lastSeenElements = [];
  }

  componentDidMount() {
    window.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.handleScroll);
    window.addEventListener('visibilitychange', this.handleVisibility);
    this.scrollFinished();
  }

  componentDidUpdate() {
    this.scrollFinished();
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleScroll);
    window.removeEventListener('visibilitychange', this.handleVisibility);
  }

  handleVisibility(ev) {
    if (ev && (ev.type === 'visibilitychange') && window.document.hidden) {
      this.lastSeenElements = [];
      return;
    }

    this.scrollFinished();
  }

  scrollFinished() {
    //
    // The following return workarounds a timing issue is integration tests.
    //
    // The scrolling handler is called several times for a page.
    // To avoid false "offer shown" signals, the code tracks which
    // offers are already shown.
    //
    // The actual handling of scrolling happens with delay.
    // If the visibility is changed in this interval (for example,
    // test has opened a new tab), the tracking information is reset
    // by `handleVisibility`, and code would send an extra signal.
    //
    if (window.document.hidden) {
      return;
    }

    const offset = 100;
    const currentSeenElements = [];

    const allOffers = (this.offersWrapper && this.offersWrapper.querySelectorAll('.offer-unit')) || [];

    allOffers.forEach((el) => {
      const offerId = el.getAttribute('data-id');
      const elmTop = el.getBoundingClientRect().top;
      const elmHight = el.clientHeight;

      if ((elmTop + offset) >= 0 && ((elmTop + elmHight) - offset) <= window.innerHeight) {
        currentSeenElements.push(offerId);
      }
      const difference = currentSeenElements.filter(x => this.lastSeenElements.indexOf(x) === -1);

      for (let i = 0; i < difference.length; i += 1) {
        const visOfferId = difference[i];

        if (this.shownOffers[visOfferId]) {
          this.shownOffers[visOfferId] += 1;
        } else {
          this.shownOffers[visOfferId] = 1;
          sendOffersMessage(visOfferId, 'offer_dsp_session');
        }
        // offerID, Action, Counter
        sendOfferShownMessage(visOfferId, 'offer_shown', 1);
      }

      this.lastSeenElements = currentSeenElements;
    });
  }

  handleScroll() {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }

    this.scrollTimer = window.setTimeout(this.scrollFinished, 350);
  }

  render() {
    return (
      <div ref={(el) => { this.offersWrapper = el; }}>
        {this.props.offers.map(offer =>
          (
            <Offer
              offer={offer}
              key={offer.offer_id}
              fullWidth={this.props.fullWidth}
              submitFeedbackForm={this.props.submitFeedbackForm}
              getOfferInfoOpen={this.props.getOfferInfoOpen}
              setOfferInfoOpen={this.props.setOfferInfoOpen}
              getOfferMenuOpen={this.props.getOfferMenuOpen}
              setOfferMenuOpen={this.props.setOfferMenuOpen}
            />
          ))
        }
      </div>
    );
  }
}

MiddleMessagesOffer.propTypes = {
  offers: PropTypes.shape({
    map: PropTypes.func,
    length: PropTypes.number
  }),
  fullWidth: PropTypes.string,
  submitFeedbackForm: PropTypes.string,
  getOfferInfoOpen: PropTypes.string,
  setOfferInfoOpen: PropTypes.string,
  getOfferMenuOpen: PropTypes.string,
  setOfferMenuOpen: PropTypes.string,
};
