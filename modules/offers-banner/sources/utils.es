import { chrome } from '../platform/globals';
import { getTab } from '../platform/tabs';
import { getActiveTab } from '../core/browser';
import logos from '../core/services/logos';

const BLACK_LIST = [
  'accounts-static.cdn.mozilla.net',
  'accounts.firefox.com',
  'addons.cdn.mozilla.net',
  'addons.mozilla.org',
  'api.accounts.firefox.com',
  'content.cdn.mozilla.net',
  'content.cdn.mozilla.net',
  'discovery.addons.mozilla.org',
  'input.mozilla.org',
  'install.mozilla.org',
  'oauth.accounts.firefox.com',
  'profile.accounts.firefox.com',
  'support.mozilla.org',
  'sync.services.mozilla.com',
  'testpilot.firefox.com',
  'chrome.google.com/webstore',
];

export function getTitleColor(templateData = {}) {
  const {
    styles: { headline_color: headlineColor } = {},
    call_to_action: { url } = {},
  } = templateData;
  if (headlineColor) { return headlineColor; }
  const logoDetails = logos.getLogoDetails(url) || { brandTxtColor: '2d2d2d' };
  return `#${logoDetails.brandTxtColor}`;
}

function canRenderOnUrl(url, title) {
  return !BLACK_LIST.some(u => url.includes(u))
    && title.toLowerCase() !== 'new tab'
    && !url.endsWith('.pdf')
    && url.startsWith('http');
}

export async function toggleApp(data) {
  const tabId = data && data.tabId !== undefined ? data.tabId : data;
  const tab = tabId === undefined
    ? await getActiveTab()
    : await getTab(tabId);
  const url = (tab && tab.url) || '';
  const title = (tab && tab.title) || '';
  if (canRenderOnUrl(url, title)) {
    chrome.browserAction.enable();
  } else {
    chrome.browserAction.disable();
  }
}

export function getOfferNotificationType(data = {}) {
  const { offer_data: { ui_info: uiInfo = {} } = {} } = data;
  return uiInfo.notif_type;
}

export function filterValues(obj, predicate) {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    if (predicate(obj[key])) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
}
