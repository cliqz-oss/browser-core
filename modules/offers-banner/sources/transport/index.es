import events from '../../core/events';
import { openLink } from '../../core/browser';
import inject from '../../core/kord/inject';
import * as browserPanel from './browser-panel';
import * as rewardBox from './reward-box';
import * as reminder from './reminder';
import * as checkout from './checkout';
import { products, chooseProduct } from '../utils';

const core = inject.module('core');

export function send(data, type) {
  const mapper = {
    offers: payload => events.pub('offers-recv-ch', payload),
    reminder: payload => events.pub('offers-reminder-recv-ch', payload),
    checkout: payload => events.pub('offers-checkout-recv-ch', payload),
  };
  const noop = () => {};
  (mapper[type] || noop)(data);
}

export function dispatcher(type, offerId, msg = {}, autoTrigger) {
  const { handler, data, action } = msg;
  const isBrowserPanel = type === 'browser-panel';
  if (!(isBrowserPanel ? handler : action) || !data) { return; }

  const mapperBrowserPanel = {
    offersIFrameHandler: payload => browserPanel.actions(offerId, payload),
    offerShown: payload => browserPanel.offerShown(offerId, payload),
    offersFirstAppearance: payload => browserPanel.offersFirstAppearance(offerId, payload),
    openUrlHandler: ({ url } = {}) => {
      openLink(window, url, true);
    },
  };

  const mapperRewardBox = {
    sendUserFeedback: payload => core.action('sendUserFeedback', { view: 'box', ...payload }),
    sendActionSignal: rewardBox.commonAction,
    sendOfferActionSignal: rewardBox.actions,
    sendOfferActionSignalMany: rewardBox.actionsMany,
    seenOffer: payload => rewardBox.seenOffer(payload, autoTrigger),
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
    remindersAction: reminder.actions,
    sendOfferActionSignal: rewardBox.actions,
    openAndClosePinnedURL: rewardBox.openAndClosePinnedURL,
  };

  const mapperCheckout = {
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
