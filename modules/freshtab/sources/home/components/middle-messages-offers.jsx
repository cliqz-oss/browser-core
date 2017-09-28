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

  // TODO: @salvador, please rethink and document this logic, we want complete
  // test covrage for it.
  scrollFinished() {
    const offset = 100;
    const currentSeenElements = [];

    const allOffers = (this.offersWrapper && this.offersWrapper.querySelectorAll('.offer-middle-notification')) || [];

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
      <div ref={(el) => { this.offersWrapper = el; }} >
        {this.props.offers.map((offer, i) =>
          <Offer offer={offer} key={i} />
        )}
      </div>
    );
  }
}

MiddleMessagesOffer.propTypes = {
  offers: PropTypes.shape({
    map: PropTypes.func,
    length: PropTypes.Number
  })
};
