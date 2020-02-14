import events from '../../core/events';
import { openLink } from '../../core/browser';
import telemetry from '../../core/services/telemetry';
import inject from '../../core/kord/inject';
import * as browserPanel from './browser-panel';
import * as rewardBox from './reward-box';
import * as reminder from './reminder';
import * as checkout from './checkout';
import { filterValues, products, chooseProduct } from '../utils';

const core = inject.module('core');

export function send(data, type) {
  const mapper = {
    telemetry: (...args) => telemetry.push(...args),
    offers: payload => events.pub('offers-recv-ch', payload),
    reminder: payload => events.pub('offers-reminder-recv-ch', payload),
    checkout: payload => events.pub('offers-checkout-recv-ch', payload),
  };
  const noop = () => {};
  (mapper[type] || noop)(data);
}

function commonTelemetry(msg, view = 'box') {
  if (!msg) { return; }
  const { target, action = 'click', vote, offersCount } = msg;
  const signal = {
    action,
    offer_count: offersCount,
    target,
    type: 'offrz',
    view,
    vote,
  };
  const newSignal = filterValues(signal, value => value !== undefined);
  send(newSignal, 'telemetry');
}

export function dispatcher(type, offerId, msg = {}, autoTrigger) {
  const { handler, data, action } = msg;
  const isBrowserPanel = type === 'browser-panel';
  if (!(isBrowserPanel ? handler : action) || !data) { return; }

  const mapperBrowserPanel = {
    offersIFrameHandler: payload => browserPanel.actions(offerId, payload),
    sendTelemetry: payload => commonTelemetry(payload, 'bar'),
    offerShown: payload => browserPanel.offerShown(offerId, payload),
    offersFirstAppearance: payload => browserPanel.offersFirstAppearance(offerId, payload),
    openUrlHandler: ({ el_id: elId, url } = {}) => {
      browserPanel.specificTelemetry(elId);
      openLink(window, url, true);
    },
  };

  const mapperRewardBox = {
    sendUserFeedback: payload => core.action('sendUserFeedback', { view: 'box', ...payload }),
    sendActionSignal: rewardBox.commonAction,
    sendOfferActionSignal: rewardBox.actions,
    seenOffer: payload => rewardBox.seenOffer(offerId, payload, autoTrigger),
    sendTelemetry: payload => commonTelemetry(payload, 'box'),
    myOffrzTurnoff: rewardBox.myOffrzTurnoff,
    openURL: (payload) => {
      rewardBox.callToAction(payload);
      openLink(window, payload.url, true, !payload.isBackgroundTab);
    },
    openAndClosePinnedURL: rewardBox.openAndClosePinnedURL,
    setOptInResult: rewardBox.setOptInResult,
    onboardingSeen: rewardBox.onboardingSeen,
    openOptions: () => openLink(window, `/options.html#${chooseProduct(products())}`, true, true),
  };

  const mapperReminder = {
    sendTelemetry: payload => commonTelemetry(payload, 'reminder'),
    remindersAction: reminder.actions,
    sendOfferActionSignal: rewardBox.actions,
    openAndClosePinnedURL: rewardBox.openAndClosePinnedURL,
  };

  const mapperCheckout = {
    sendTelemetry: payload => commonTelemetry(payload, 'checkout'),
    checkoutsAction: checkout.actions,
    log: checkout.log,
    sendOfferActionSignal: rewardBox.actions,
    openAndClosePinnedURL: rewardBox.openAndClosePinnedURL,
    openURL: (payload) => {
      rewardBox.callToAction(payload);
      openLink(window, payload.url, true, !payload.isBackgroundTab);
    },
  };

  const mapper = {
    'offers-cc': mapperRewardBox,
    'browser-panel': mapperBrowserPanel,
    'offers-reminder': mapperReminder,
    'offers-checkout': mapperCheckout,
  };
  if (!mapper[type]) { return; }
  const actionOrHandler = isBrowserPanel ? handler : action;
  const noop = () => {};
  (mapper[type][actionOrHandler] || noop)(data);
}
