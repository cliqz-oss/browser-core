
/* TEMPORARY port of adblocker content-script injection into green-ads
 *
 */

var selectedAds;


function greenAdsInjectScript(s, doc) {
  var script = doc.createElement('script');
  script.type = 'text/javascript';
  script.id = 'cliqz-adblocker-script';
  script.textContent = s;
  doc.getElementsByTagName('head')[0].appendChild(script);
}


function greenAdsBlockScript(filter, document) {
  var fRegex = new RegExp(filter);
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

var debug = false;
function _dump(msg) {
  if (debug) dump(`GreenAds ${msg}`);
}


function getWindowId(window) {
  return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
    .getInterface(Components.interfaces.nsIDOMWindowUtils).outerWindowID;
}


/**
 * Iterate on elements of the DOM dedicated to ads.
 */
function forEachAdPlacement(window, cb) {
  var selectors = [
    '[id^="contentad-"]'
    // '.Ad',
    // '.adsbygoogle',
  ];

  // Iterate async
  return new Promise((resolve) => {
    // Find ads placements
    for (var selector of selectors) {
      var adsElements = window.document.querySelectorAll(selector);
      _dump(`>>>>> CHIP found ads emplacements: ${adsElements.length} for ${selector}\n`);
      for (var ad of adsElements) {
        try {
          var result = cb(ad);
          // If the callback returns `false`, we stop iterating on placements.
          if (result === false) {
            _dump('terminate early\n');
            resolve();
            return;
          }
        } catch (ex) {
          _dump(`exception while iterating on ad placements: ${ex} ${ex.stack}\n`);
        }
      }
    }

    resolve();
  });
}


function getWindowTreeInformation(window) {
  var currentWindow = window;

  // Keep track of window IDs
  var currentId = getWindowId(window);
  var windowId = currentId;
  var parentId;

  while (currentId !== getWindowId(currentWindow.parent)) {
    // Go up one level
    parentId = currentId;
    currentWindow = currentWindow.parent;
    currentId = getWindowId(currentWindow);
  }

  return {
    originWindowID: currentId,
    parentWindowID: parentId,
    outerWindowID: windowId,
  };
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


function getAbsoluteInformation(url, window) {
  var parents = [url];
  var currentUrl = url;
  var currentWindow = window;

  // Offset to the top
  var offsetTop = 0;
  var offsetLeft = 0;

  while (currentUrl !== currentWindow.parent.document.documentURI) {
    try {
      // Update offset
      offsetTop += currentWindow.document.body.offsetTop;
      offsetLeft += currentWindow.document.body.offsetLeft;
    } catch (ex) { /* ignore if body is undefined */ }

    // Go up one level
    currentUrl = currentWindow.parent.document.documentURI;
    parents.push(currentUrl);
    currentWindow = currentWindow.parent;
  }

  return {
    parents,
    offsetTop,
    offsetLeft,
    documentUrl: currentUrl,
    documentWindow: currentWindow,
  };
}


function unhideDocument(window) {
  // Make document visible now
  var css = window.document.querySelector('#cliqz-ads-css-rules');
  if (css !== null) {
    css.parentElement.removeChild(css);
  }
}


function injectCSS(window, id, content) {
  // Hide document until we injected the ads
  var document = window.document;
  var css = document.createElement('style');
  css.type = 'text/css';
  css.id = id;
  document.getElementsByTagName('head')[0].appendChild(css);
  css.appendChild(document.createTextNode(content));
}


function hideDocument(window) {
  injectCSS(window, 'cliqz-ads-css-rules', 'body { display:none !important; }');
}


function greenAdsListenerOnAdDivs(args) {
  var {
    documentUrl
  , window
  , send
  , windowId
  , windowTreeInformation
  , throttle } = args;

  // Attach listener to all native ads
  forEachAdPlacement(window, (element) => {
    var sendEvent = (action, extra) => {
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

    var onClick = () => sendEvent('adClicked', 'simple');
    var onAuxClick = () => sendEvent('adClicked', 'aux');
    var onMouseOver = throttle(() => sendEvent('adOver'), 250);

    // Collect iframes having a `src` attribute, and located in a div dedicated
    // to ads. TODO - make use of an exhaustive list of selectors.
    var adFrames = [...element.querySelectorAll('iframe')].filter(f => f.src);
    var queue = [...element.querySelectorAll('iframe')].filter(f => !f.src);

    while (queue.length > 0) {
      // Explore iframe with no src
      var frame = queue.pop();
      frame.contentWindow.document.querySelectorAll('iframe').forEach((f) => {
        if (f.src) {
          adFrames.push(f);
        } else {
          queue.push(f);
        }
      });
    }

    // Only keep ads that are visible
    // Attach listeners
    adFrames.filter(f => f.clientHeight > 0).forEach((f) => {
      _dump(`GREENAD FOUND AD IFRAME ${f.src}\n`);
      f.addEventListener('click', onClick, false);
      f.addEventListener('auxclick', onAuxClick, false);
      f.addEventListener('mouseover', onMouseOver, false);
    });
  });
}


function greenAdsCollectIframesRec(args) {
  var {
      url
    , window
    , send
    , windowId
    , windowTreeInformation
    , documentUrl } = args;

  // ////////////////////////////////////////////////
  //    Inspect iframes
  // ////////////////////////////////////////////////

  var {
    offsetTop,
    offsetLeft,
  } = getAbsoluteInformation(url, window);

  // Get geometry information about the window
  var bbMain = window.document.body.getBoundingClientRect();
  var mainFrame = {
    x: offsetLeft,
    y: offsetTop,
    width: bbMain.width,
    height: bbMain.height,
  };

  // Inspect frames contained in this window
  var iframes = [];

  // Inspect iframes
  window.document.querySelectorAll('iframe').forEach((iframe) => {
    _dump(`GREENADS newFrame iframe state ${iframe.contentDocument.readyState}\n`);
    if (iframe.contentDocument.body !== null) {
      var bb = iframe.contentDocument.body.getBoundingClientRect();
      var {
        offsetTop: iframeOffsetTop,
        offsetLeft: iframeOffsetLeft,
      } = getAbsoluteInformation(iframe.src, iframe.contentWindow);

      var newFrame = {
        x: iframeOffsetLeft,
        y: iframeOffsetTop,
        name: iframe.name,
        src: iframe.src,
        height: bb.height, // NOTE: iframe.contentDocument.body.scrollWidth,
        width: bb.width, // NOTE: iframe.contentDocument.body.scrollHeight,
        windowTreeInformation: getWindowTreeInformation(iframe.contentWindow),
      };
      iframes.push(newFrame);
      _dump(`  GEOMETRY iframe ${JSON.stringify(newFrame)}\n`);
    }
  });

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
          mainFrame,
          iframes,
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

  _dump('>>>>> Starting parsing >>>>\n');
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
            // _dump(`>>>> alt text 2 ${text}\n`);
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
            // _dump(`>>>> alt text 2 ${text}\n`);
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

  if (url === documentUrl && url.indexOf('chip.de') > -1) {
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
  _dump(`>>> AD MATCHING STARTED >>>\n`);
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
  _dump(`>>> AD MATCHING finished >>>\n`);

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
  _dump(` >>> LOOK FOR ADS ${id}\n`);

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
  var displayed = 0;

  // Extract text from the page
  // Try getting description
  var adsToShow = getTokens(window.document, url, documentUrl, inventory);

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

      var { ad: adToDisplay, reason } = getNextAd(ad.id, adsToShow);
      if (adToDisplay === null) {
        return true;
      }

      // Create a hyperlink to wrap the ad
      var newAd = window.document.createElement('a');
      newAd.id = 'cliqz-chip-ad';
      newAd.className = adToDisplay.id;
      newAd.href = adToDisplay.url;
      newAd.target = '_blank';
      newAd.rel = 'noreferrer noopener';

      var sendEvent = (action, extra) => {
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
      var onClick = () => sendEvent('adClicked', 'simple');
      var onAuxClick = () => sendEvent('adClicked', 'aux');
      var onMouseOver = throttle(() => sendEvent('adOver'), 250);
      newAd.addEventListener('click', onClick, false);
      newAd.addEventListener('auxclick', onAuxClick, false);
      newAd.addEventListener('mouseover', onMouseOver, false);

      // Img containing the ad itself
      var img = window.document.createElement('img');
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


var greenAdsOnMessageReceived = function ({ msg, window }) {
  if (msg.data && msg.data.payload && msg.data.module === 'green-ads') {
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
  if (msg.data && msg.data.response && msg.data.response.type === 'domain-rules') {
    if (!msg.data.response.active) return;
    msg.data.response.scripts.forEach(s => greenAdsInjectScript(s, window.document));
    msg.data.response.scriptBlock.forEach(s => greenAdsBlockScript(s, window.document));
  }
};


var greenAdsOnDOMCreated = function ({ url, window, send, windowId, windowTreeInformation, mode }) {
  var {
    originWindowID,
    outerWindowID,
  } = windowTreeInformation;
  var { documentUrl } = getUrlsToTop(url, window);

  if (documentUrl.indexOf('chip.de') !== -1 && originWindowID === outerWindowID) {
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
    }
  }
};


var greenAdsOnDOMLoaded = function (args) {
  var {
    url,
    window,
    send,
    windowId,
    windowTreeInformation,
    mode,
    inventory,
    throttle } = args;

  var {
    originWindowID,
    outerWindowID,
  } = windowTreeInformation;
  var { documentUrl } = getUrlsToTop(url, window);

  if (documentUrl.indexOf('chip.de') !== -1 && originWindowID === outerWindowID) {
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
        });
    }
  }
};


var greenAdsOnFullLoad = function (args) {
  // Nothing is done while in green mode
  if (args.mode !== 'collect') {
    return;
  }

  var {
    url,
    window,
    send,
    windowId,
    windowTreeInformation,
    throttle } = args;

  var {
    originWindowID,
    outerWindowID,
  } = windowTreeInformation;

  // Get parent URL (Document URL)
  var { documentUrl } = getUrlsToTop(url, window);

  // Only proceed when we are on a chip.de page
  if (!documentUrl || documentUrl.indexOf('chip.de') === -1) {
    return;
  }

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
};
