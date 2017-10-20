import {
  registerContentScript,
  CHROME_MSG_SOURCE,
} from '../core/content/helpers';

import { normalizeAclkUrl } from './ad-detection';
import logger from './logger';

function logException(e) {
  logger.error('Exception caught:', e, e.stack);
}

export function parseDom(url, window, windowId) {
  const document = window.document;

  // Let's try and get META refresh to detect javascript redirects.
  try {
    let jsRef = null;
    jsRef = document.querySelector('script');
    if (jsRef && jsRef.innerHTML.indexOf('location.replace') > -1) {
      const location = document.querySelector('title').textContent;
      chrome.runtime.sendMessage({
        source: CHROME_MSG_SOURCE,
        windowId,
        payload: {
          module: 'human-web',
          action: 'jsRedirect',
          args: [{
            message: {
              location,
              url: document.location.href
            }
          }]
        }
      });
    }
  } catch (ee) {
    logException(ee);
  }

  try {
    let _ad = '';
    let _h = false;

    if (document.querySelector('#s0p1c0')) {
      _ad = document.querySelector('#s0p1c0').href;
    }

    if (document.querySelector('#tads .ads-ad')) {
      if (document.querySelector('#tads .ads-ad').offsetParent === null) _h = true;
    }

    const additionalInfo = {
      type: 'dom',
      ad: _ad,
      hidden: _h
    };

    chrome.runtime.sendMessage({
      source: CHROME_MSG_SOURCE,
      windowId,
      payload: {
        module: 'human-web',
        action: 'contentScriptTopAds',
        args: [{
          message: additionalInfo
        }]
      }
    });
  } catch (ee) {
    logException(ee);
  }

  // We need to get all the ADS from this page.
  try {
    const adDetails = {};
    const doc = window.document;
    let noAdsOnThisPage = 0;
    const detectAdRules = {
      query: {
        element: '#ires',
        attribute: 'data-async-context'
      },
      adSections: ['.ads-ad', '.pla-unit-container', '.pla-hovercard-content-ellip'],
      0: {
        cu: ".ad_cclk h3 a[id^='s0p'],.ad_cclk h3 a[id^='s3p']",
        fu: ".ad_cclk h3 a[id^='vs0p'],.ad_cclk h3 a[id^='vs3p']"
      },
      1: {
        cu: "a[id^='plaurlg']",
        fu: "a[id^='vplaurlg']"
      },
      2: {
        cu: "a[id^='plaurlh']",
        fu: "a[id^='vplaurlh']"
      }
    };


    // We need to scrape the query too.
    const queryElement = doc.querySelector(detectAdRules.query.element);
    let query = '';

    if (queryElement) {
      query = queryElement.getAttribute(detectAdRules.query.attribute).replace('query:', '');

      try {
        query = decodeURIComponent(query);
      } catch (ee) {
      }
    }

      // Let's iterate over each possible section of the ads.
    detectAdRules.adSections.forEach((eachAdSection, idx) => {
      const adNodes = Array.prototype.slice.call(doc.querySelectorAll(eachAdSection));

      adNodes.forEach((eachAd) => {
        const cuRule = detectAdRules[idx].cu;
        const fuRule = detectAdRules[idx].fu;

        const clink = eachAd.querySelector(cuRule);
        const flink = eachAd.querySelector(fuRule);

        if (clink && flink) {
          const clickPattern = normalizeAclkUrl(clink.href);

          adDetails[clickPattern] = {
            ts: Date.now(),
            query,
            furl: [flink.getAttribute('data-preconnect-urls'), flink.href] // At times there is a redirect chain, we only want the final domain.
          };

          noAdsOnThisPage += 1;
        }
      });
    });

    if (noAdsOnThisPage > 0) {
      chrome.runtime.sendMessage({
        source: CHROME_MSG_SOURCE,
        windowId,
        payload: {
          module: 'human-web',
          action: 'adClick',
          args: [{
            ads: adDetails
          }]
        }
      });
    }
  } catch (ee) {
    logException(ee);
  }
}

registerContentScript('http*', (window, chrome, windowId) => {
  const url = window.location.href;

  // Only ad for main pages.
  if (window.parent && url === window.parent.document.documentURI) {
    window.addEventListener('DOMContentLoaded', () => {
      parseDom(url, window, windowId);
    });
  }
});
