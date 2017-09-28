import cliqz from '../cliqz';

export function sendOffersMessage(offerId, actionId, signalType = 'offer-action-signal') {
  const message = {
    origin: 'cliqz-tab',
    type: signalType,
    data: {
      action_id: actionId,
      offer_id: offerId,
    }
  };

  cliqz.offersV2.processRealEstateMessage(message);
}

export function sendOfferShownMessage(offerId, actionId, counter) {
  const message = {
    origin: 'cliqz-tab',
    type: 'offer-action-signal',
    data: {
      action_id: actionId,
      offer_id: offerId,
      counter,
    }
  };

  cliqz.offersV2.processRealEstateMessage(message);
}

