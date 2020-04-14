import { chrome } from '../../platform/globals';
import { isGhostery } from '../../core/platform';
import prefs from '../../core/prefs';
import events from '../../core/events';
import { setTimeout as coreSetTimeout } from '../../core/timers';
import { send } from './index';
import { matchPatternsByUrl } from '../utils';

const REAL_ESTATE_ID = isGhostery ? 'ghostery' : 'offers-cc';
const MAX_TMP_PINNED_TAB_LIVE = 5 * 1000;

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

export function actionsMany(payload = []) { payload.forEach(actions); }

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

export function seenOffer({ offer_id: offerId } = {}, autoTrigger) {
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

export function myOffrzTurnoff() {
  if (!isGhostery) { return; }
  events.pub('myoffrz:turnoff');
}

const _removeTabIfNeeded = (tab, patterns) => (_, __, tabInfo) => {
  if (tab.id !== tabInfo.id) { return; }
  if (tabInfo.status === 'complete' && matchPatternsByUrl(patterns, tabInfo.url || '')) {
    chrome.tabs.remove(tab.id);
  }
};

export function openAndClosePinnedURL({ url, matchPatterns = [] } = {}) {
  if (!url) { return; }
  chrome.tabs.create({ url, pinned: true, active: false }, (createdTab) => {
    const callback = _removeTabIfNeeded(createdTab, matchPatterns);
    chrome.tabs.onUpdated.addListener(callback);
    coreSetTimeout(() => {
      chrome.tabs.remove(createdTab.id, () => {
        if (chrome.runtime.lastError) { /* tab has been already removed */ }
      });
      chrome.tabs.onUpdated.removeListener(callback);
    }, MAX_TMP_PINNED_TAB_LIVE);
  });
}

export function setOptInResult({ optin = true } = {}) {
  // user just has seen optin dialog;
  // `opted_in` pref we use in ghostery extension
  prefs.set('myoffrz.opted_in', true);

  const actionId = optin ? 'offer_first_optin' : 'offer_first_optout';
  commonAction({ actionId });
}

export function onboardingSeen({ interested = true } = {}) {
  // user just has seen onboarding notification
  prefs.set('myoffrz.seen_onboarding_notification', true);

  const actionId = interested ? 'onboarding_interested' : 'onboarding_not_interested';
  commonAction({ actionId });
}
