import { URLInfo } from '../core/url-info';
import md5 from '../core/helpers/md5';
import inject from '../core/kord/inject';
import prefs from '../core/prefs';
import EventEmitter from '../core/event-emitter';
import cookies from '../platform/cookies';
import { getGeneralDomain } from '../core/tlds';

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/* Takes as parameter the price catch in the url.
 * Returns the price converted to USD.
 * We assume that the url prices are either in microdollars
 * or USD. */
function calculatePrice(pr) {
  if (isNumeric(pr)) {
    if (pr % 1 === 0) { // number is int
      // convert microdollars to dollars
      // cpm
      if (pr.toString().length <= 3) return pr / 1000.0;
      // microdollars
      if (pr.toString().length <= 7) return pr / 1000000.0;
      // wrong number
      return 0;
    }
    // number is float
    if (pr < 0.15) return pr; // price is lower than 0.15 dollars
    // if its above 0.15 dollars it must be cpm so divide by 1000
    return pr / 1000.0;
  }
  return 0;
}

const sizeKeys = new Set(['size', 'adsize', 'sz', 'res', 'dims', 'format']);
const widthKeys = new Set(['width', 'vadw', 'winWidth']);
const heightKeys = new Set(['height', 'vcdh', 'winHeight']);

function getFormat(urlParams) {
  const size = urlParams.find(kv => sizeKeys.has(kv.k));
  if (size) {
    return size.v;
  }
  const width = urlParams.find(kv => widthKeys.has(kv.k));
  if (width) {
    return `${width.v}x${(urlParams.find(kv => heightKeys.has(kv.k)) || { v: 0 }).v}`;
  }
  return '';
}

export default class AdDetector extends EventEmitter {
  constructor() {
    super(['telemetry']);
    this.keywords = new Set();
    this.vendorKeywords = {};
    this.adDomains = new Set();
    this.pageInfo = new Map();
    this.cookies = [];
  }

  async init() {
    (await cookies.getAll({})).forEach((cookie) => {
      if (!cookie.session && cookie.value.length > 10) {
        const domain = cookie.domain[0] === '.' ? cookie.domain.substring(1) : cookie.domain;
        if (this.adDomains.has(getGeneralDomain(domain))) {
          this.cookies.push([domain, cookie.value]);
        }
      }
    });
  }

  onRequest(details) {
    if (details.type === 'main_frame') {
      return;
    }
    const urlParts = URLInfo.get(details.url);
    if (!urlParts || (!this.vendorKeywords[urlParts.generalDomain]
      && !this.adDomains.has(urlParts.generalDomain))) {
      return;
    }
    if (this.cookies.some(([domain, cki]) => details.url.includes(cki)
      && urlParts.generalDomain !== domain)) {
      this.getPageInfo(details.tabId, details.sourceUrl).cookieSyncing = true;
    }
    const params = urlParts.getKeyValues();
    // look for keywords specfic to publisher
    if (this.vendorKeywords[urlParts.generalDomain]) {
      const pubKeywords = this.vendorKeywords[urlParts.generalDomain];
      const keyMatches = params.filter(kv => pubKeywords.indexOf(kv.k) > -1);
      if (keyMatches.length > 0 && keyMatches.some(kv => isNumeric(kv.v))) {
        const priceMatch = keyMatches.findIndex(kv => isNumeric(kv.v));
        // send price
        const price = calculatePrice(keyMatches[priceMatch].v);
        const payload = {
          type: 'price',
          page: details.sourceUrl,
          url: details.url,
          site: URLInfo.get(details.sourceUrl).generalDomain,
          vendor: urlParts.generalDomain,
          format: getFormat(params),
          keyword: keyMatches[priceMatch].k,
          value: keyMatches[priceMatch].v,
          price,
        };
        this.addDetection(details.tabId, payload);
        return;
      }
      // no match on known vendor
      return;
    }
    // look for any matching keyword
    const keyMatches = params.filter(kv => this.keywords.has(kv.k) && isNumeric(kv.v));
    if (keyMatches.length > 0) {
      // send manual inspection
      const payload = {
        type: 'manual',
        url: details.url,
        page: details.sourceUrl,
        vendor: urlParts.generalDomain,
        format: getFormat(params),
        keyword: keyMatches[0].k,
        value: keyMatches[0].v,
      };
      this.addDetection(details.tabId, payload);
    }
  }

  getPageInfo(tabId, pageUrl) {
    let info = this.pageInfo.get(tabId);
    if (info && pageUrl && info.page !== pageUrl) {
      this.stageTab(tabId);
      info = null;
    }
    if (!info) {
      info = {
        page: pageUrl,
        cookieSyncing: false,
        payloads: new Map(),
      };
      this.pageInfo.set(tabId, info);
    }
    return info;
  }

  addDetection(tabId, payload) {
    const { page, url } = payload;
    const info = this.getPageInfo(tabId, page);
    info.payloads.set(url, payload);
    if (info.timeout) {
      clearTimeout(info.timeout);
    }
    info.timeout = setTimeout(() => this.stageTab(tabId), 60000);
  }

  async stageTab(tabId) {
    const info = this.pageInfo.get(tabId);
    this.pageInfo.delete(tabId);

    if (info.timeout) {
      clearTimeout(info.timeout);
    }

    // extract payload information and deduplicate
    const dedup = new Set();
    for (const entry of info.payloads.values()) {
      if (entry.type === 'price') {
        const { vendor, format, keyword, value, price, url } = entry;
        dedup.add(JSON.stringify({
          vendor,
          format,
          keyword,
          value,
          price,
          url,
        }));
      } else {
        const { vendor, format, keyword, value } = entry;
        dedup.add(JSON.stringify({
          vendor,
          format,
          keyword,
          value,
        }));
      }
    }
    const results = [...dedup].map(JSON.parse);
    const payload = {
      site: md5(URLInfo.get(info.page).generalDomain).substring(0, 16),
      day: prefs.get('config_ts'),
      hour: new Date().getHours(),
      country: prefs.get('config_location'),
      city: prefs.get('config_location.city'),
      cookieSync: info.cookieSyncing,
      dnt: prefs.get('privacy.donottrackheader.enabled', false, ''),
      antitracking: await this.isEnabled('antitracking', info.page),
      adblocker: await this.isEnabled('adblocker', info.page),
      prices: results,
    };
    this.emit('telemetry', payload);
  }

  async isEnabled(moduleName, url) {
    const mod = inject.module(moduleName);
    if (!mod.isEnabled() || (moduleName === 'adblocker' && !(await mod.action('isEnabled')))) {
      return false;
    }
    return !(await mod.action('isWhitelisted', url));
  }
}
