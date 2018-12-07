import { send } from './index';

const REAL_ESTATE_ID = 'offers-cc';

export function actions(data = {}) {
  const { element_id: elementId, signal_type: signalType, offer_id: offerId } = data;
  const mapper = {
    'remove-offer': { offer_id: offerId },
    'offer-action-signal': { action_id: elementId, offer_id: offerId },
  };

  const payload = mapper[signalType];
  if (!payload) { return; }
  const msg = {
    origin: REAL_ESTATE_ID,
    data: payload,
    type: signalType,
  };
  send(msg, 'offers');
}

export function commonAction({ actionId } = {}) {
  const msg = {
    origin: REAL_ESTATE_ID,
    type: 'action-signal',
    data: { action_id: actionId }
  };
  send(msg, 'offers');
}

function makeMsg(offerId, actionId) {
  return {
    type: 'offer-action-signal',
    origin: REAL_ESTATE_ID,
    data: {
      offer_id: offerId,
      action_id: actionId,
    },
  };
}

export function callToAction(data = {}) {
  const { isCallToAction, offerId, elemId } = data;
  if (!isCallToAction) { return; }
  send(makeMsg(offerId, 'offer_ca_action'), 'offers');
  if (elemId) { send(makeMsg(offerId, `offer_${elemId}`), 'offers'); }
}

export function seenOffer(providedOfferId, data, autoTrigger) {
  const offerId = data.offer_id || providedOfferId;

  send(makeMsg(offerId, 'offer_dsp_session'), 'offers');
  send(makeMsg(offerId, 'offer_shown'), 'offers');
  if (!autoTrigger) { send(makeMsg(offerId, 'offer_pulled'), 'offers'); }

  const msg = {
    origin: REAL_ESTATE_ID,
    type: 'change-offer-state',
    data: { offers_ids: [offerId], new_state: 'old' }
  };
  send(msg, 'offers');
}

export function hideTooltipIfShould(data = {}) {
  const { hideTooltip } = data;
  if (hideTooltip) {
    ['tooltip_clicked', 'tooltip_closed'].forEach((actionId) => {
      const msg = {
        origin: REAL_ESTATE_ID,
        type: 'action-signal',
        data: { action_id: actionId }
      };
      send(msg, 'offers');
    });
  }
}
