import { chrome } from '../../platform/globals';
import { setTimeout as coreSetTimeout } from '../../core/timers';
import { send } from './index';
import { matchPatternsByUrl } from '../utils';

const REAL_ESTATE_ID = 'offers-cc';
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
