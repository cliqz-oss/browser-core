import { registerContentScript
       , throttle
       , getWindowTreeInformation
       , getWindowId } from '../core/content/helpers';
import store from '../core/content/store';
import logger from './logger';

// import { getGeneralDomain } from '../core/tlds';


// TODO - remove as soon as we can import `../core/tlds` directly.
function _extractDomain(url) {
  let domain = url;

  // We need to check that the index is <= because this protocol could appear
  // as a value of a parameter in the URL.
  const indexOfProtocol = url.indexOf('://');
  if (indexOfProtocol !== -1 && indexOfProtocol <= 6) {
    domain = url.substring(indexOfProtocol + 3);
  }

  const indexOfSlash = domain.indexOf('/');
  if (indexOfSlash !== -1) {
    domain = domain.substring(0, indexOfSlash);
  }

  if (domain.startsWith('www.')) {
    domain = domain.substring(4);
  }

  return domain;
}


function isChipDomain(url) {
  // return getGeneralDomain(documentUrl) === 'chip.de';
  const domain = _extractDomain(url);
  return domain.indexOf('chip.de') !== -1;
}


/* TEMPORARY port of adblocker content-script injection into green-ads
 *
 */

let selectedAds;


function greenAdsInjectScript(s, doc) {
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.id = 'cliqz-adblocker-script';
  script.textContent = s;
  doc.getElementsByTagName('head')[0].appendChild(script);
}


function greenAdsBlockScript(filter, document) {
  const fRegex = new RegExp(filter);
  document.addEventListener('beforescriptexecute', (ev) => {
    if (fRegex.test(ev.target.textContent)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  });
}


/** *************************************************************************\
 *                              WINDOW UTILS
 ****************************************************************************/

/**
 * Iterate on elements of the DOM dedicated to ads.
 */
function forEachAdPlacement(window, cb) {
  // TODO - how to make it scale to different websites?
  const selectors = [
    '[id^="contentad-"]'
    // '.Ad',
    // '.adsbygoogle',
  ];

  // Iterate async
  return new Promise((resolve) => {
    // Find ads placements
    for (var selector of selectors) {
      var adsElements = window.document.querySelectorAll(selector);
      logger.debug(`[content] found ads emplacements: ${adsElements.length} for ${selector}`);
      for (var ad of adsElements) {
        try {
          var result = cb(ad);
          // If the callback returns `false`, we stop iterating on placements.
          if (result === false) {
            logger.debug('[content] terminate early');
            resolve();
            return;
          }
        } catch (ex) {
          logger.debug(`[content] exception while iterating on ad placements: ${ex} ${ex.stack}`);
        }
      }
    }

    resolve();
  });
}


function getWindowParents(window) {
  let currentWindow = window;

  // Keep track of window IDs
  let currentId = getWindowId(window);
  const parents = [];

  while (currentId !== getWindowId(currentWindow.parent)) {
    // Go up one level
    parents.push({
      id: currentId,
      url: currentWindow.document.documentURI,
    });
    currentWindow = currentWindow.parent;
    currentId = getWindowId(currentWindow);
  }

  parents.push({
    id: currentId,
    url: currentWindow.document.documentURI,
  });

  return parents;
}


function getUrlsToTop(url, window) {
  var parents = [url];
  var currentUrl = url;
  var currentWindow = window;

  while (currentUrl !== currentWindow.parent.document.documentURI) {
    // Go up one level
    currentUrl = currentWindow.parent.document.documentURI;
    parents.push(currentUrl);
    currentWindow = currentWindow.parent;
  }

  return {
    parents,
    documentUrl: currentUrl,
  };
}


function injectCSS(window, id, content) {
  // Hide document until we injected the ads
  const document = window.document;
  const css = document.createElement('style');
  css.type = 'text/css';
  css.id = id;
  document.getElementsByTagName('head')[0].appendChild(css);
  css.appendChild(document.createTextNode(content));
}


function hideDocument(window) {
  injectCSS(window, 'cliqz-ads-css-rules', 'body { display:none !important; }');
}


function unhideDocument(window) {
  // Make document visible now
  const css = window.document.querySelector('#cliqz-ads-css-rules');
  if (css !== null) {
    css.parentElement.removeChild(css);
  }
}


function isElementVisible(element) {
  return element.clientHeight > 0;
}


function forEachVisibleFrame(element, cb, rec = false) {
  // TODO - some ad iframes don't have any src attribute, so we might miss some
  // of them.
  const queue = [...element.querySelectorAll('iframe')];

  while (queue.length > 0) {
    // Explore iframe with no src
    const frame = queue.pop();
    if (isElementVisible(frame)) {
      cb(frame);

      if (!rec) continue;
    }

    // Collect rec
    frame.contentDocument.querySelectorAll('iframe').forEach((f) => {
      queue.push(f);
    });
  }
}


function greenAdsListenerOnAdDivs(args) {
  const {
    documentUrl
  , window
  , send
  , windowId
  , windowTreeInformation
  , throttle } = args;

  // Attach listener to all native ads
  forEachAdPlacement(window, (element) => {
    const sendEvent = (action, extra) => {
      send({
        windowId,
        payload: {
          module: 'green-ads',
          action,
          args: [
            windowTreeInformation,
            documentUrl, /* originUrl */
            element.id,
            Date.now(),
            extra,
          ],
        },
      });
    };

    // NOTE - for real ads, we rely only on the heuristics present in
    // green-ads.es since the events are often blocked by advertisers. We just
    // keep adOver, which seems to be robust enough.
    const onMouseOver = throttle(() => sendEvent('adOver'), 250);
    forEachVisibleFrame(element, (iframe) => {
      logger.debug(`[content] found ad iframe ${iframe.src}`);
      iframe.addEventListener('mouseover', onMouseOver, false);
    });
  });
}


function greenAdsCollectIframesRec(args) {
  const {
      url
    , window
    , send
    , windowId
    , windowTreeInformation
    , documentUrl } = args;

  const parents = getWindowParents(window);

  // Inspect frames contained in this window
  const iframes = [];

  // Collect visible iframes (having a defined `src` attribute) + metadata
  forEachVisibleFrame(window.document, (iframe) => {
    if (iframe.contentDocument.body !== null) {
      iframes.push({
        windowTreeInformation: getWindowTreeInformation(iframe.contentWindow),
        hasCanvas: iframe.contentDocument.querySelector('canvas') !== null,
        hrefs: [...iframe.contentDocument.querySelectorAll('a')]
          .map(a => a.href)       // Select only href
          .filter(href => href),  // Keep only non-empty ones
        src: iframe.src,
        parents: getWindowParents(iframe.contentWindow),
        readyState: iframe.contentDocument.readyState,
      });
    }
  }, true);

  send({
    windowId,
    payload: {
      module: 'green-ads',
      action: 'onNewFrame',
      args: [
        windowTreeInformation,
        documentUrl,  /* originUrl */
        Date.now(),
        {
          url,
          iframes,
          parents,
        },
      ]
    }
  });
}


/** *************************************************************************\
 *                           INVENTORY MANAGEMENT
 ****************************************************************************/

var SPECIAL_SYMBOL_RE = /[.\/,:!()[\];\"\'@?<>_#{}+&%$=-]/g;
var NUMBER_RE = /[0-9]{4}/g;

function processStr(str, replaceChar) {
  // Need to strip of any character like :,-; from the token with a space.
  var cleanStr = str;
  try {
    cleanStr = decodeURIComponent(str);
  } catch (e) { /* ignore */ }

  cleanStr = cleanStr.replace(SPECIAL_SYMBOL_RE, replaceChar).toLowerCase();
  cleanStr = cleanStr.replace(NUMBER_RE, replaceChar);
  return cleanStr;
}


// This will parse the page body to get the tokens to match relevant ads.
function getTokens(document, url, documentUrl, inventory) {
  var adsToShow = {};

  logger.debug('[content] Starting parsing');
  var text = [];
  // var tokenFrequency = {};

  try {
    var descriptionTag = document.querySelector('meta[name="description"]').content;
    var cleanTag = processStr(descriptionTag, ' ');
    cleanTag.split(' ').forEach( eachToken => {
      // Check length of each token and it's not already present in text.
      var cleanToken = processStr(eachToken, '');
      // if (!tokenFrequency.hasOwnProperty(cleanToken)) tokenFrequency[cleanToken] = 0;
      // tokenFrequency[cleanToken] += 1;
      if(cleanToken.length >= 4 && inventory.tokens[cleanToken]) {
        // text += ' ' + cleanToken;
        text.push(cleanToken);
      }
    });
  } catch(ee) {}

  try {
    var newsKeywords  = document.querySelector('meta[name="news_keywords"]').content;
    var cleanNewsKeywords = processStr(newsKeywords,' ');
    cleanNewsKeywords.split(',').forEach( eachToken => {
      // Check length of each token and it's not already present in text.
      var cleanToken = processStr(eachToken, '');
      // if (!tokenFrequency.hasOwnProperty(eachToken)) tokenFrequency[eachToken] = 0;
      // tokenFrequency[cleanToken] += 1;
      if(cleanToken.length >= 4 && inventory.tokens[cleanToken]) {
        // text += ' ' + cleanToken;
        text.push(cleanToken);
      }
    });
  } catch(ee) {}

  // Let's get the headings.

  try {
    var paras  = Array.prototype.slice.call(document.querySelectorAll('p'));
    paras.forEach( eachPara => {
      var paraContent = eachPara.textContent;
      if (paraContent) {
        var cleanParaContent = processStr(paraContent, ' ');
        cleanParaContent.split(' ').forEach( para => {
          // Check length of each token and it's not already present in text.
          var paraToken = processStr(para, '');
          // if (!tokenFrequency.hasOwnProperty(paraToken)) tokenFrequency[paraToken] = 0;
          // tokenFrequency[paraToken] += 1;
          if( (paraToken.length >= 4 && inventory.tokens[paraToken])) {
            // text += ' ' + altToken;
            text.push(paraToken);
            // logger.debug(`alt text 2 ${text}`);
          }
        });
      }

    });
  } catch(ee) {}

  // Let's get all the alt tags from images.
  ['h1','h2','h3'].forEach( e => {
    var headings = Array.prototype.slice.call(document.querySelectorAll(e));
    if (headings) {
      headings.forEach( y => {
        var cleanContent = processStr(y.textContent, ' ');
        cleanContent.split(' ').forEach( token => {
          var cleanToken = processStr(token, '');
          if( (cleanToken.length >= 4 && inventory.tokens[cleanToken])) {
            text.push(cleanToken);
          }
        });
      });
    }
  });

  try {
    var imgTags  = Array.prototype.slice.call(document.querySelectorAll('img'));
    imgTags.forEach( imgTag => {
      var altContent = imgTag.getAttribute('alt');
      if (altContent) {
        var cleanAltContent = processStr(altContent, ' ');
        cleanAltContent.split(' ').forEach( alt => {
          // Check length of each token and it's not already present in text.
          var altToken = processStr(alt, '');
          // if (!tokenFrequency.hasOwnProperty(altToken)) tokenFrequency[altToken] = 0;
          // tokenFrequency[altToken] += 1;
          if( (altToken.length >= 4 && inventory.tokens[altToken])) {
            // text += ' ' + altToken;
            text.push(altToken);
            // logger.debug(`alt text 2 ${text}`);
          }
        });
      }

    });
  } catch(ee) {}

  // Let's go through all the <span> tags and get the titles.
  try {
    if(text.length < 1000) {
      var spanTags = Array.prototype.slice.call(document.querySelectorAll('span'));
      spanTags.forEach( eachSpan => {
        var spanContent  = eachSpan.textContent;
        if (spanContent) {
          var cleanSpanContent = processStr(spanContent, ' ');
          cleanSpanContent.split(' ').forEach( eachToken => {
            var cleanToken = processStr(eachToken, '');
            // if (!tokenFrequency.hasOwnProperty(cleanToken)) tokenFrequency[cleanToken] = 0;
            // tokenFrequency[cleanToken] += 1;
            if ( cleanToken.length > 4 && inventory.tokens[cleanToken] ) { // tokenFrequency[cleanToken] >=2 )) {
              text.push(cleanToken);
            }
          });
        }
      });
    }
  } catch(ee) {}

  if (url === documentUrl) {
    selectedAds = {top_banner: [], normal: [], skyscraper: []};

    var filteredAds = [];
    var filteredTokens = [];
    inventory.index['top_banner'] = 0;
    inventory.index['normal'] = 0;
    inventory.index['skyscraper'] = 0;

    adsToShow['top_banner'] = [];
    adsToShow['normal'] = [];
    adsToShow['skyscraper'] = [];

    matchAds(text, inventory.ads, adsToShow);
  };


  return adsToShow;
}



/** *************************************************************************\
 *                              TARGETING
 ****************************************************************************/

function calMagnitude(map) {
  var total = 0;
  for (var token in map) {
    total += map[token] * map[token];
  }

  return Math.sqrt(total);
}

function similarityMatching(a, b){

  // We preprocess the inventory selectors.
  var tokenFrequencySelectors = {};
  var tokenFrequencyPage = {};
  var productAB = 0;
  var allTokens = {};
  var intersection = new Set();
  var simScore = 0;

  // a => Selectors from the ad.
  // b => processed string from the page.

  a.forEach( e => {
    tokenFrequencySelectors[e] =  (tokenFrequencySelectors[e] || 0) + 1;
    allTokens[e] = 1;
  });

  b.forEach( e => {
    tokenFrequencyPage[e] =  (tokenFrequencyPage[e] || 0) + 1;
    allTokens[e] = 1;
  });

  for (var token in allTokens) {
    if (tokenFrequencySelectors.hasOwnProperty(token) && tokenFrequencyPage.hasOwnProperty(token)) {
      productAB += tokenFrequencySelectors[token] * tokenFrequencyPage[token];
      intersection.add(token);
    }
  }

  simScore = productAB / (calMagnitude(tokenFrequencySelectors) * calMagnitude(tokenFrequencyPage));

  if (isNaN(simScore)) simScore = 0;
  return {s: simScore, i: [...intersection]};
}

function similarity(a, b) {
  var a1 = a.slice();
  var b1 = b.slice();
  return similarityMatching(a1, b1);
}


function matchAds(text, ads, adsToShow) {
  logger.debug(`[content] AD MATCHING STARTED ${text}`);
  var tmpAds = {top_banner: [] , normal: [], skyscraper: []};
  ads.forEach((e) => {
    var result = similarity(e.processedSelectors, text);
    if (true) {
      e['reason'] = JSON.stringify(result.i);
      e['score'] = [];

      var keyname = `${result.s}:${e.id}`;
      selectedAds[e.format][keyname] = e;
    }
  });
  logger.debug('[content] AD MATCHING finished');

  var _topBannerKeys = Object.keys(selectedAds['top_banner']).sort((a,b) => {return b.split(':')[0] - a.split(':')[0]});
  var topBannerKeys = _topBannerKeys.slice(0,4); // shuffle(_topBannerKeys.slice(0,5));

  topBannerKeys.forEach( e => {
    adsToShow['top_banner'].push(selectedAds['top_banner'][e]);
  });

  var _normal = Object.keys(selectedAds['normal']).sort((a,b) => {return b.split(':')[0] - a.split(':')[0]});
  var normal = _normal.slice(0,4); // shuffle(_normal.slice(0,5));


  normal.forEach( e => {
    adsToShow['normal'].push(selectedAds['normal'][e]);
  });

  var _skyScraperKeys = Object.keys(selectedAds['skyscraper']).sort((a,b) => {return b.split(':')[0] - a.split(':')[0]});
  var skyScraperKeys = _skyScraperKeys.slice(0,4); // shuffle(_skyScraperKeys.slice(0,8));

  skyScraperKeys.forEach( e => {
    adsToShow['skyscraper'].push(selectedAds['skyscraper'][e]);
  });
}


function getNextAd(id, adsToShow) {
  // Needs to be fixed, if any of the ad types is missing goes into an infinte loop.
  // If ADS is not available it stalls the page.

  var format;
  logger.debug(`[content] LOOK FOR ADS ${id}`);

  if (id.indexOf('native-slot') !== -1) {
    // Ignore
  } else if (id.indexOf('small') !== -1) {
    format = 'normal';
  } else if (id.indexOf('banner') !== -1) {
    format = 'top_banner';
  } else if (id.indexOf('commercial') !== -1) {
    format = 'normal';
  } else if (id.indexOf('rectangle') !== -1) {
    format = 'normal';
  } else if (id.indexOf('skyscraper') !== -1) {
    format = 'skyscraper';
  } else if (id.indexOf('content-box-') !== -1) {
    format = 'normal';
  } else if (id.indexOf('footer-tfm') !== -1) {
    format = 'top_banner';
  }

  if (format === undefined) {
    return {
      ad: null,
      reason: null,
    };
  }

  var inspected = 0;
  // var key = Object.keys(selectedAds[format]).sort(function(a, b){return b-a})[inventory.index[format]];
  // var ad = adsToShow[format][inventory.index[format]];
  var ad = adsToShow[format][Math.floor(Math.random(0, 1) * adsToShow[format].length)];

  // inventory.index[ad.format] = (inventory.index[ad.format] + 1) % adsToShow[format].length;

  var reason = [`${ad.reason} >>> ${ad.score}`];
  while (!(ad.format === format && reason.length > 0)) {
    // If we inspected all ads but none was found, we break the loop
    if (inspected >= adsToShow.length) {
      break;
    }

    // var key = Object.keys(selectedAds[format]).sort(function(a, b){return b-a})[inventory.index[format]];
    // var ad = adsToShow[format][inventory.index[format]];
    ad = adsToShow[format][Math.floor(Math.random(0, 1) * adsToShow[format].length)];
    // Konark hack: not to be pushed to prod.
    // reason = selectorMatch(text, ad.selectors, ad.brand);

    reason = [`${ad.reason} >>> ${ad.score}`];
    // inventory.index[format] = (inventory.index[format] + 1) % adsToShow[format].length;
    inspected += 1;
  }

  if (ad.format !== format) {
    return {
      ad: null,
      reason: null,
    };
  }

  return {
    ad,
    reason
  };
}


function greenAdsInsertChipAds({ url, window, send, windowId, windowTreeInformation, documentUrl, inventory, throttle }) {
  // Keep track of how many ads we displayed
  let displayed = 0;

  // Extract text from the page
  // Try getting description
  const adsToShow = getTokens(window.document, url, documentUrl, inventory);

  // Iterate on ad placements async
  return forEachAdPlacement(window, (ad) => {
    if (!ad.id.startsWith('contentad-adblocker')) {
      // In some skyscraper ads, the style is not present hence breaking
      // the alignment. For keeping the page layout from breaking, we
      // decided to not display the adv, if the style is not defined.
      if (ad.style.length === 0) {
        return true;
      }

      // Early termination of iteration on ad placements
      if (displayed >= inventory.maxAds) {
        return false;
      }

      const { ad: adToDisplay } = getNextAd(ad.id, adsToShow);
      if (adToDisplay === null) {
        return true;
      }

      // Create a hyperlink to wrap the ad
      const newAd = window.document.createElement('a');
      newAd.id = 'cliqz-chip-ad';
      newAd.className = adToDisplay.id;
      newAd.href = adToDisplay.url;
      newAd.target = '_blank';
      newAd.rel = 'noreferrer noopener';

      const sendEvent = (action, extra) => {
        send({
          windowId,
          payload: {
            module: 'green-ads',
            action,
            args: [
              windowTreeInformation,
              documentUrl, /* originUrl */
              adToDisplay.id,
              Date.now(),
              extra,
              newAd.className,
            ],
          },
        });
      };

      // Add a listener on click on this Ad.
      const onClick = () => sendEvent('adClicked', 'simple');
      const onAuxClick = () => sendEvent('adClicked', 'aux');
      const onMouseOver = throttle(() => sendEvent('adOver'), 250);
      newAd.addEventListener('click', onClick, false);
      newAd.addEventListener('auxclick', onAuxClick, false);
      newAd.addEventListener('mouseover', onMouseOver, false);

      // Img containing the ad itself
      const img = window.document.createElement('img');
      img.id = 'cliqz-chip-ad';
      img.className = `icon-${adToDisplay.hash}`;
      img.src = adToDisplay.img;
      img.title = 'This Green Ad has been selected inside of your Cliqz browser with total respect of your privacy (meaning that none of your private information left the browser). The decision is made based on locally stored data as well as the content of the page.';

      newAd.appendChild(img);
      displayed += 1;
      ad.appendChild(newAd);

      // Ad inserted, send a message to background to signal
      sendEvent('adShown');
    }

    return true;
  });
}


/** *************************************************************************\
 *                             EVENT LISTENERS
 ****************************************************************************/


function greenAdsOnMessageReceived({ msg, window }) {
  if (msg && msg.payload && msg.module === 'green-ads') {
    // Mark detected ads with red + transparency
    // injectCSS(window, 'cliqz-ads-css-rules-highlight', `
    //   body {
    //     opacity: 0.5;
    //     background-color: red;
    //     content: " ";
    //     z-index: 10;
    //     display: block;
    //     position: absolute;
    //     height: 100%;
    //     top: 0;
    //     left: 0;
    //     right: 0;
    //   }
    // `);
  }

  // Trigger adblocker injection
  if (msg && msg.response && msg.response.type === 'domain-rules') {
    if (!msg.response.active) return;
    msg.response.scripts.forEach(s => greenAdsInjectScript(s, window.document));
    msg.response.scriptBlock.forEach(s => greenAdsBlockScript(s, window.document));
  }
}


function greenAdsOnDOMCreated(args) {
  const { window
        , send
        , windowId
        , windowTreeInformation
        , mode
        , documentUrl } = args;
  const {
    originWindowID,
    outerWindowID,
  } = windowTreeInformation;

  if (originWindowID === outerWindowID) {
    send({
      windowId,
      payload: {
        module: 'green-ads',
        action: 'onDOMCreated',
        args: [
          windowTreeInformation,
          documentUrl, /* originUrl */
          Date.now(),
        ],
      },
    });

    if (mode === 'green') {
      // Hide the whole document until everything is loaded
      hideDocument(window);
      window.setTimeout(
        () => { unhideDocument(window); },
        1000
      );
    }
  }
}


function greenAdsOnDOMLoaded(args) {
  var {
    url,
    window,
    send,
    windowId,
    windowTreeInformation,
    mode,
    inventory,
    documentUrl,
    throttle } = args;

  var {
    originWindowID,
    outerWindowID,
  } = windowTreeInformation;

  if (originWindowID === outerWindowID) {
    send({
      windowId,
      payload: {
        module: 'green-ads',
        action: 'onDOMLoaded',
        args: [
          windowTreeInformation,
          documentUrl, /* originUrl */
          Date.now(),
        ],
      },
    });

    // Only inject ads in 'green' mode
    if (mode === 'green') {
      // Load the sprite css.
      // <link rel="stylesheet" type="text/css" href="URL">
      // injectCSS(window, 'banner', _css);

      // Async
      return greenAdsInsertChipAds({ url, window, send, windowId, windowTreeInformation, documentUrl, inventory, throttle })
        .then(() => unhideDocument(window))
        .then(() => {
          // In green mode, full load is after ads have been loaded.
          // It's fine to do it from the DOM Created event, after we injected the
          // ads.
          // send({
          //   windowId,
          //   payload: {
          //     module: 'green-ads',
          //     action: 'onFullLoad',
          //     args: [
          //       windowTreeInformation,
          //       documentUrl, /* originUrl */
          //       Date.now(),
          //     ],
          //   },
          // });
        });
    }
  }
}


function greenAdsOnFullLoad(args) {
  const {
    url,
    window,
    send,
    windowId,
    windowTreeInformation,
    documentUrl,
    throttle } = args;

  const {
    originWindowID,
    outerWindowID,
  } = windowTreeInformation;

  send({
    windowId,
    payload: {
      module: 'green-ads',
      action: 'onFullLoad',
      args: [
        windowTreeInformation,
        documentUrl, /* originUrl */
        Date.now(),
      ],
    },
  });

  // Nothing is done while in green mode
  if (args.mode !== 'collect') {
    return;
  }

  if (originWindowID === outerWindowID) {
    greenAdsListenerOnAdDivs({
      documentUrl,
      window,
      send,
      windowId,
      windowTreeInformation,
      throttle,
    });
  }

  greenAdsCollectIframesRec({
    url,
    window,
    send,
    windowId,
    windowTreeInformation,
    documentUrl,
  });
}


registerContentScript('http://*.chip.de/*', (window, chrome, windowId) => {
  const config = store.get('green-ads');
  if (!config || config.mode === 'disabled') {
    return;
  }

  const windowTreeInformation = getWindowTreeInformation(window);
  const url = window.location.href;
  const { documentUrl } = getUrlsToTop(url, window);

  // Make sure the the top level url has chip.de as a general domain
  if (!isChipDomain(documentUrl)) {
    return;
  }

  const onReady = () => {
    greenAdsOnDOMLoaded({
      documentUrl,
      inventory: config.inventory,
      mode: config.mode,
      send: chrome.runtime.sendMessage,
      throttle: throttle.bind(null, window),
      url,
      window,
      windowId,
      windowTreeInformation,
    });
  };

  const onLoad = () => {
    greenAdsOnFullLoad({
      documentUrl,
      mode: config.mode,
      send: chrome.runtime.sendMessage,
      throttle: throttle.bind(null, window),
      url,
      window,
      windowId,
      windowTreeInformation,
    });
  };

  const onMessage = (msg) => {
    greenAdsOnMessageReceived({ msg, window });
  };

  const onUnload = () => {
    window.removeEventListener('DOMContentLoaded', onReady);
    window.removeEventListener('unload', onUnload);
    window.removeEventListener('load', onLoad);
    chrome.runtime.onMessage.removeListener(onMessage);
  };

  window.addEventListener('DOMContentLoaded', onReady);
  window.addEventListener('load', onLoad);
  window.addEventListener('unload', onUnload);
  chrome.runtime.onMessage.addListener(onMessage);

  greenAdsOnDOMCreated({
    documentUrl,
    mode: config.mode,
    send: chrome.runtime.sendMessage,
    url,
    window,
    windowId,
    windowTreeInformation,
  });
});
