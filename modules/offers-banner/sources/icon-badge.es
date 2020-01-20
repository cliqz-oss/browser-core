import { chrome } from '../platform/globals';
import { getActiveTab } from '../core/browser';
import { getMessage } from '../core/i18n';
import { findTabs } from '../core/tabs';
import { extractHostname } from '../core/tlds';

export function setIconBadge(product, { tabId, count } = {}) {
  const colors = {
    myoffrz: 'rgb(20,20,20)',
    amo: 'rgb(255, 80, 55)',
    cliqz: 'rgb(255, 80, 55)',
    chip: 'rgb(20,20,20)',
    freundin: 'rgb(20,20,20)',
  };
  const badgeText = count === undefined || count === 1
    ? getMessage('myoffrz_badge_text_new')
    : String(count);

  chrome.browserAction.setBadgeBackgroundColor({ color: colors[product] || null });
  const optionalData = tabId ? { tabId } : {};
  chrome.browserAction.setBadgeText({ ...optionalData, text: badgeText });
  if (chrome.browserAction.setBadgeTextColor) { // goo chrome does not support it
    chrome.browserAction.setBadgeTextColor({ color: 'white' });
  }
}

/*
  we really need to reset twice,
  because value can be set for special tab
  and also it can be set just in general
*/
export async function resetIconBadge({ byhost = true } = {}) {
  chrome.browserAction.setBadgeText({ text: '' });
  const tab = await getActiveTab();
  const url = tab && byhost
    ? `*://*.${extractHostname(tab.url)}/*`
    : null; // match any url
  const tabs = await findTabs(url);
  tabs.forEach(t => chrome.browserAction.setBadgeText({ text: '', tabId: t.id }));
}
