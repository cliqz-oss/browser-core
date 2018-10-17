import events from '../core/events';
import utils from '../core/utils';
import { copyToClipboard } from '../core/clipboard';

const REAL_ESTATE_ID = 'browser-panel';

function send(data, type) {
  const mapper = {
    offers: payload => events.pub('offers-recv-ch', payload),
    telemetry: utils.telemetry,
  };
  const noop = () => {};
  (mapper[type] || noop)(data);
}

function specificTelemetry(value) {
  const mapper = {
    code_copied: 'copy_code',
    offer_closed: 'remove',
    more_about_cliqz: 'learn_more',
    offer_description: 'use',
    offer_ca_action: 'use',
    offer_title: 'use',
    offer_logo: 'use',
  };
  const target = mapper[value];
  if (!target) { return; }
  const signal = { type: 'offrz', view: 'bar', action: 'click', target };
  send(signal, 'telemetry');
}

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

function actions(offerId, data = {}) {
  const { signal_type: signalType, element_id: elementId } = data;
  const mapper = {
    button_pressed: buttonActions,
  };
  if (!mapper[signalType]) { return; }
  specificTelemetry(elementId);
  mapper[signalType](offerId, data);
}

function commonTelemetry(msg) {
  if (!msg) { return; }
  const { target, action } = msg;
  const signal = { type: 'offrz', view: 'bar', action, target };
  send(signal, 'telemetry');
}

function offersFirstAppearance(offerId) {
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

function offerShown(offerId) {
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

export default function dispatcher(offerId, msg = {}) {
  const { handler, data } = msg;
  if (!handler || !data) { return; }
  const mapper = {
    offersIFrameHandler: payload => actions(offerId, payload),
    openUrlHandler: ({ el_id: elId } = {}) => specificTelemetry(elId),
    sendTelemetry: commonTelemetry,
    offerShown: payload => offerShown(offerId, payload),
    offersFirstAppearance: payload => offersFirstAppearance(offerId, payload),
    copyToClipboard,
  };
  const noop = () => {};
  (mapper[handler] || noop)(data);
}
