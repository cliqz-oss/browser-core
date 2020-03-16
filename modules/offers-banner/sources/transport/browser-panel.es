import { send } from './index';

const REAL_ESTATE_ID = 'browser-panel';


function caAction(offerId, elementId) {
  const callToActionSignals = new Set([
    'offer_logo',
    'offer_picture',
    'offer_benefit',
    'offer_headline',
    'offer_title',
    'offer_description',
  ]);
  if (!callToActionSignals.has(elementId)) { return; }
  const msg = {
    origin: REAL_ESTATE_ID,
    type: 'offer-action-signal',
    data: { action_id: 'offer_ca_action', offer_id: offerId },
  };
  send(msg, 'offers');
}

function buttonActions(offerId, { element_id: elementId } = {}) {
  const mapper = {
    'remove-offer': ['remove-offer', { offer_id: offerId }],
    more_about_cliqz: ['action-signal', { action_id: elementId }],
  };
  const value = mapper[elementId];
  if (!value) { caAction(offerId, elementId); }

  const defaultValue = ['offer-action-signal', {
    action_id: elementId,
    offer_id: offerId,
  }];
  const [type, payload] = value || defaultValue;
  const msg = {
    origin: REAL_ESTATE_ID,
    data: payload,
    type
  };
  send(msg, 'offers');
}

export function actions(offerId, data = {}) {
  const { signal_type: signalType } = data;
  const mapper = {
    button_pressed: buttonActions,
  };
  if (!mapper[signalType]) { return; }
  mapper[signalType](offerId, data);
}

export function offersFirstAppearance(offerId) {
  const msg = {
    origin: REAL_ESTATE_ID,
    type: 'offer-action-signal',
    data: {
      action_id: 'offer_dsp_session',
      offer_id: offerId,
    }
  };
  send(msg, 'offers');
}

export function offerShown(offerId) {
  const msg = {
    origin: REAL_ESTATE_ID,
    type: 'offer-action-signal',
    data: {
      action_id: 'offer_shown',
      offer_id: offerId,
    }
  };
  send(msg, 'offers');
}
