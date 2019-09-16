import { chrome } from '../platform/globals';
import { getTab } from '../platform/tabs';
import adblocker from '../platform/lib/adblocker';
import { getActiveTab } from '../core/browser';
import logos from '../core/services/logos';
import { isCliqzBrowser, isAMO } from '../core/platform';
import config from '../core/config';

const ALLOWED_PRODUCTS = ['chip', 'freundin'];
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

export function products() {
  return {
    cliqz: isCliqzBrowser,
    amo: isAMO,
    chip: config.settings['chip-standalone.enabled'],
    freundin: config.settings['freundin-standalone.enabled'],
    incent: config.settings['incent-standalone.enabled'],
  };
}

export function chooseProduct(options = {}) {
  return ALLOWED_PRODUCTS.find(product => options[product]) || 'myoffrz';
}

export function matchPatternsByUrl(patterns, url) {
  const request = adblocker.Request.fromRawDetails({ url, type: 'script' });
  return (patterns).reduce((acc, pattern) => {
    const filter = adblocker.NetworkFilter.parse(pattern);
    return acc || filter.match(request);
  }, false);
}
