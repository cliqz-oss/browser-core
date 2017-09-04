import WebRequest from '../core/webrequest';

import md5 from '../antitracking/md5';

import WebRequestContext from '../webrequest-pipeline/webrequest-context';
import { AdBlocker } from '../adblocker/adblocker';

import PageLoad from './statistics';
import logger from './logger';
import SessionTracker from './sessions';
import { isChipAdDependency } from './blocking';
import { isDoubleclick, isOutbrain } from './advertisers';
import { sanitiseUrl, extractDomain, extractGeneralDomain } from './utils';


export default class {
  constructor(greenMode, isAdbActive, isAntitrackingActive, antitracking, sendTelemetry) {
    // Getters to check state of adblocker and antitracking
    this.isAdbActive = isAdbActive;
    this.isAntitrackingActive = isAntitrackingActive;
    this.antitracking = antitracking;
    this.qsWhitelist = null;

    // Current state of green-ads module (green or normal?)
    this.greenMode = greenMode;

    // Create adblocker
    this.adblocker = new AdBlocker({ action() { return Promise.resolve(); } }, {
      useCountryList: false,
    });

    // Keep a mapping between URLs and tabIds
    this.tabIdToUrl = new Map();
    this.tabs = [];

    // Keep track of what window ids we consider as ads clicked
    // To avoid duplicate.
    this.adsClickedTabs = new Set();

    // Keep track of pages
    this.tempPageLoads = {};

    // Temporary mock, before the real tabTracker is received from antitracking.
    this.tabTracker = {
      getPageForTab() {},
      getOpenPages() { return []; },
    };

    this.antitracking.action('getTabTracker').then((tabTracker) => {
      this.tabTracker = tabTracker;
      this.tabTracker.addEventListener('stage', (tabId, page) => {
        this.tempPageLoads[tabId] = undefined;

        if (page.greenads) {
          const msg = page.greenads.aggregate();
          logger.debug(`Send telemetry for page ${msg.url}`);
          sendTelemetry({
            type: 'humanweb',
            action: 'greenads.page',
            payload: msg,
          });
        }
      });
    });

    // TODO - persist history of the user?
    // visits to chip.de domain: number of time.
    // Could be done with history tool probably?
    this.sessions = new SessionTracker(['chip.de'], this.greenMode, sendTelemetry);
  }

  initListeners() {
    if (this.onBeforeRequestListener === undefined) {
      // onBeforeRequest will be used to block third party requests.
      this.onBeforeRequestListener = this.onBeforeRequest.bind(this);
      WebRequest.onBeforeRequest.addListener(
        this.onBeforeRequestListener,
        undefined,
        ['blocking'],
      );
    }

    // onBeforeSendHeaders is used to collect statistics on requests.
    // We use this hook instead of onBeforeRequest because some events are not
    // captured by the former (eg: 302 moved temporarily).
    if (this.onBeforeSendHeadersListener === undefined) {
      this.onBeforeSendHeadersListener = this.onBeforeSendHeaders.bind(this);
      WebRequest.onBeforeSendHeaders.addListener(
        this.onBeforeSendHeadersListener,
        undefined,
        [],
      );
    }

    // onHeadersReceived is used to collect statistics about responses.
    if (this.onHeadersReceivedListener === undefined) {
      this.onHeadersReceivedListener = this.onHeadersReceived.bind(this);
      WebRequest.onHeadersReceived.addListener(
        this.onHeadersReceivedListener,
        undefined,
        [],
      );
    }
  }

  unloadListeners() {
    if (this.onBeforeRequestListener) {
      WebRequest.onBeforeRequest.removeListener(this.onBeforeRequestListener);
      this.onBeforeRequestListener = undefined;
    }

    if (this.onBeforeSendHeadersListener) {
      WebRequest.onBeforeSendHeaders.removeListener(this.onBeforeSendHeadersListener);
      this.onBeforeSendHeadersListener = undefined;
    }

    if (this.onHeadersReceivedListener) {
      WebRequest.onHeadersReceived.removeListener(this.onHeadersReceivedListener);
      this.onHeadersReceivedListener = undefined;
    }
  }

  initAdblocker() {
    return this.adblocker.init();
  }

  unloadAdblocker() {
    this.adblocker.unload();
  }

  init() {
    this.sessions.init();
    return Promise.all([
      this.initListeners(),
      this.initAdblocker(),
      this.antitracking.action('getWhitelist')
        .then((qsWhitelist) => { this.qsWhitelist = qsWhitelist; }),
    ]);
  }

  toggle(greenMode) {
    this.greenMode = greenMode;
    this.initListeners();
    this.sessions.toggleState(greenMode);
  }

  unload() {
    this.unloadAdblocker();
    this.unloadListeners();
    this.sessions.unload();
  }

  isFromAllowedAdvertiser(url) {
    const hostGD = extractGeneralDomain(url);
    return isDoubleclick(hostGD);
  }

  isUrlFromTracker(url) {
    if (this.qsWhitelist) {
      const hostGD = extractGeneralDomain(url);
      const hash = md5(hostGD).substring(0, 16);
      return this.qsWhitelist.isTrackerDomain(hash);
    }
    return false;
  }

  shouldProceedWithUrl(url) {
    return extractGeneralDomain(url) === 'chip.de';
  }

  updateTabMappings(windowTreeInformation, originUrl) {
    this.tabIdToUrl.set(windowTreeInformation.originWindowID, originUrl);
  }

  /* Tab activity book-keeping
   * =========================
   *
   *
   */

  getLastActiveTab() {
    if (this.tabs.length > 0) {
      return this.tabs[this.tabs.length - 1];
    }

    return null;
  }

  /**
   * We keep track of the latest active tab. These events will be registered:
   * - tab_select
   * - any user activity (mouse, key press, copy, scroll)
   *
   * The latest element of the `this.tabs` array is always the latest active.
   */
  touchTab(windowTreeInformation, url) {
    const { originWindowID } = windowTreeInformation;

    const isCollectedPage = this.shouldProceedWithUrl(url);
    const event = {
      // The event always counts for the main document
      windowTreeInformation: {
        originWindowID,
        parentWindowID: originWindowID,
        outerWindowID: originWindowID,
      },
      url,
      isCollectedPage,
      timestamp: Date.now(),
    };

    if (this.tabs.length === 0) {
      this.tabs.push(event);
    } else {
      const lastEvent = this.tabs[this.tabs.length - 1];
      if (lastEvent.windowTreeInformation.originWindowID !== originWindowID) {
        this.tabs.push(event);
      } else {
        lastEvent.timestamp = Date.now();
      }
    }
  }

  /* Detecting clicked ads
   * =====================
   * - listen to location changes
   * - check if the tabId is different from the last active tabId
   * - make sure we don't count the same tabId twice
   * - the originUrl or triggeringUrl needs to be trackers (antitracking)
   * - check if the last user action (on the previously on the tab of origin) was close enough
   */

  /* Check if an ad has been clicked.
   */

  onStateChange(windowTreeInformation, originUrl, triggeringUrl) {
    const {
      originWindowID,
      outerWindowID,
    } = windowTreeInformation;

    this.updateTabMappings(windowTreeInformation, originUrl);

    // Only consider main documents
    if (originWindowID !== outerWindowID) {
      logger.debug(`adCheck should be main document only ${originWindowID} !== ${outerWindowID}`);
      return;
    }

    if (!(originUrl || triggeringUrl)) {
      logger.debug('adCheck !originUrl && !triggeringUrl');
      return;
    }

    const lastActiveTab = this.getLastActiveTab();
    if (lastActiveTab === null) {
      logger.debug('adCheck lastActiveTab === null');
      return;
    }

    // Check if the tab is different
    if (originWindowID === lastActiveTab.windowTreeInformation.originWindowID ||
        !lastActiveTab.isCollectedPage) {
      logger.debug(`adCheck tab is not different ${originWindowID} ${JSON.stringify(lastActiveTab)}`);
      return;
    }

    // Check if the last user action was close enough
    if (lastActiveTab.timestamp < (Date.now() - 10000)) {
      logger.debug(`adCheck last action of user was too long ago ${Date.now() - lastActiveTab.timestamp} ${JSON.stringify(lastActiveTab)}`);
      return;
    }

    // Comes from a tab which we already count as ad click
    if (this.adsClickedTabs.has(originWindowID)) {
      logger.debug('adCheck already count as an Ad');
      return;
    }

    // Check if the domain is a tracker, and consider this as an ad.
    if (this.isFromAllowedAdvertiser(originUrl) || this.isFromAllowedAdvertiser(triggeringUrl)) {
      logger.debug(`locationChange isAd ${originWindowID} ${originUrl} ${triggeringUrl}`);
      this.adsClickedTabs.add(originWindowID);
      this.onAdClicked(
        lastActiveTab.windowTreeInformation,
        lastActiveTab.url,
        originUrl,
        Date.now());
    } else {
      logger.debug(`locationChange NOT AD ${originWindowID} ${originUrl} ${triggeringUrl}`);
    }
  }

  /* Web request listeners
   * =====================
   *
   * - on opened request
   * - on modify request
   * - on response
   */

  onBeforeRequest(requestInfo) {
    const requestContext = new WebRequestContext(requestInfo);
    const sourceUrl = requestContext.getSourceURL();
    const url = requestContext.url;
    const windowTreeInformation = {
      originWindowID: requestContext.getOriginWindowID(),
      parentWindowID: requestContext.getParentWindowID(),
      outerWindowID: requestContext.getOuterWindowID(),
    };

    this.updateTabMappings(windowTreeInformation, sourceUrl);

    // Only consider chip.de for this experiment
    if (!this.shouldProceedWithUrl(sourceUrl)) {
      return {};
    }

    if (requestContext.isFullPage()) {
      return {};
    }

    const host = extractDomain(url);
    const hostGD = extractGeneralDomain(url);

    // Kill outbrain
    if (isOutbrain(hostGD)) {
      logger.log(`cancel ${url}`);
      return { cancel: true };
    }

    // When in collect mode, we let a few ads through.
    if (!this.greenMode) {
      // Allow chip-deps?
      if (isChipAdDependency(host, hostGD)) {
        return {};
      }

      // Allow double-click
      if (isDoubleclick(hostGD)) {
        return {};
      }
    }

    // Exceptions:
    // const response = isException(url);
    // if (response !== null) {
    //   logger.log(`exception ${url} ${JSON.stringify(response)}`);
    //   return response;
    // }

    // const host = extractDomain(url);
    // const hostGD = extractGeneralDomain(url);

    // White-list selected advertisers
    // if (!this.greenMode) {
    //   if (isChipAdDependency(host, hostGD)) {
    //     return {};
    //   }

    //   if (isCDN(host, hostGD)) {
    //     return {};
    //   }

    //   if (isDoubleclick(hostGD)) {
    //     logger.log(`doubleclick ${url}`);
    //     return {};
    //   }


    //   // TODO - deal with other advertisers
    // }

    // Everything else should come from chip.de
    // if (hostGD !== 'chip.de') {
    //   logger.log(`cancel ${url}`);
    //   return { cancel: true };
    // }

    // Check host of the request
    // NOTE: this breaks some images, although images are fetched from
    // It would be nice to be able to block chip ads, because they might bias
    // the results of our green-ads (eg: we detect a chip ad clicked as a
    // green ad clicked).
    //
    // chip.de, they might depend on ad-js.chip.de dependencies...
    // const domain = extractDomain(url);
    // if (domain === 'ad-js.chip.de') {
    //   return { cancel: true };
    // }
    const result = this.adblocker.match({
      sourceURL: sourceUrl,
      url,
      cpt: requestContext.getContentPolicyType(),
      method: requestContext.method,
    });

    if (result.redirect) {
      logger.log(`redirect ${url}`);
      return { redirectUrl: result.redirect };
    } else if (result.match) {
      logger.log(`cancel ${url}`);
      return { cancel: true };
    }

    logger.log(`allow ${url}`);
    return {};
  }

  onBeforeSendHeaders(requestInfo) {
    const requestContext = new WebRequestContext(requestInfo);
    const sourceUrl = requestContext.getSourceURL();
    const windowTreeInformation = {
      originWindowID: requestContext.getOriginWindowID(),
      parentWindowID: requestContext.getParentWindowID(),
      outerWindowID: requestContext.getOuterWindowID(),
    };

    // Only consider chip.de for this experiment
    if (!this.shouldProceedWithUrl(sourceUrl)) {
      return {};
    }

    if (requestContext.isFullPage()) {
      this.updateTabMappings(windowTreeInformation, sourceUrl);
      this.onNewLoadingDocument(windowTreeInformation, sourceUrl, Date.now());
      return {};
    }

    // Check what the adblocker would do for this request
    const url = requestContext.url;
    const cpt = requestContext.getContentPolicyType();
    const wouldBeBlocked = this.isFromAllowedAdvertiser(url);

    this.onRequestOpen(windowTreeInformation, sourceUrl, Date.now(), {
      url,
      sourceUrl,
      cpt,
      wouldBeBlocked,
    });

    return {};
  }

  onHeadersReceived(requestInfo) {
    const requestContext = new WebRequestContext(requestInfo);
    const sourceUrl = requestContext.getSourceURL();
    const windowTreeInformation = {
      originWindowID: requestContext.getOriginWindowID(),
      parentWindowID: requestContext.getParentWindowID(),
      outerWindowID: requestContext.getOuterWindowID(),
    };

    this.updateTabMappings(windowTreeInformation, sourceUrl);

    // Only consider chip.de for this experiment
    if (!this.shouldProceedWithUrl(sourceUrl)) {
      return {};
    }

    const headers = requestInfo.responseHeaders;
    const url = requestContext.url;
    const cpt = requestContext.getContentPolicyType();

    // Check what the adblocker would do for this request
    const wouldBeBlocked = this.isFromAllowedAdvertiser(url);
    const isFromTracker = this.isFromAllowedAdvertiser(url);

    // Register statistics for this request
    this.onRequestResponse(windowTreeInformation, sourceUrl, Date.now(), {
      url,
      sourceUrl,
      cpt,
      headers,
      wouldBeBlocked,
      isFromTracker,
      isCached: requestInfo.isCached,
    });

    return {};
  }

  /* Page loading book-keeping
   * =========================
   */

  aggregate() {
    const pages = {};

    this.forEachPage((page, url) => {
      pages[sanitiseUrl(url)] = page.aggregate();
    });

    return pages;
  }

  forEachPage(cb) {
    this.tabTracker.getOpenPages().forEach((p) => {
      if (p.greenads) {
        cb(p.greenads, p.url);
      }
    });
  }

  getPageID({ originWindowID }, originUrl) {
    return `${originWindowID}_${originUrl}`;
  }

  hasPage({ originWindowID }) {
    const page = this.tabTracker.getPageForTab(originWindowID);
    return page !== undefined && page.greenads;
  }

  getPage(windowTreeInformation, originUrl) {
    const tabId = windowTreeInformation.originWindowID;
    const page = this.tabTracker.getPageForTab(tabId);
    let greenadsPageStats;

    // It could be that tp_event takes more time to create the structure for
    // this page since web request listeners are async (Should be solve with the
    // global pipeline).
    // In the meanwhile, we need to store a temporary instance of the PageLoad.
    if (!page) {
      if (this.tempPageLoads[tabId] !== undefined) {
        greenadsPageStats = this.tempPageLoads[tabId];
      } else {
        // Create a new page if needed
        greenadsPageStats = new PageLoad(windowTreeInformation, originUrl, this.greenMode);
        this.tempPageLoads[tabId] = greenadsPageStats;
      }
    } else if (page.greenads === undefined) {
      if (this.tempPageLoads[tabId] !== undefined) {
        greenadsPageStats = this.tempPageLoads[tabId];
        this.tempPageLoads[tabId] = undefined;
        page.greenads = greenadsPageStats;
      } else {
        // Create a new page if needed
        greenadsPageStats = new PageLoad(windowTreeInformation, originUrl, this.greenMode);
        page.greenads = greenadsPageStats;
      }
    } else {
      greenadsPageStats = page.greenads;
    }

    // Refresh last activity
    greenadsPageStats.lastActivity = Date.now();

    return greenadsPageStats;
  }

  //
  // Activity listener
  //

  onUserActivity(windowTreeInformation, originUrl, timestamp, action) {
    logger.debug(`onUserActivity ${originUrl} ${action} ${Date.now()}`);
    // A user activity should not create a new session if none exist
    if (!this.hasPage(windowTreeInformation, originUrl)) return;

    this.getPage(windowTreeInformation, originUrl).onUserActivity(
      windowTreeInformation,
      originUrl,
      timestamp,
      action,
    );
  }

  // Page loading events
  //
  // - DOM Created
  // - DOM loaded
  // - DOM + dependencies loaded

  onDOMCreated(windowTreeInformation, originUrl, timestamp) {
    this.getPage(windowTreeInformation, originUrl).onDOMCreated(
      windowTreeInformation,
      originUrl,
      timestamp
    );
  }

  onDOMLoaded(windowTreeInformation, originUrl, timestamp) {
    this.getPage(windowTreeInformation, originUrl).onDOMLoaded(
      windowTreeInformation,
      originUrl,
      timestamp
    );
  }

  onFullLoad(windowTreeInformation, originUrl, timestamp) {
    this.getPage(windowTreeInformation, originUrl).onFullLoad(
      windowTreeInformation,
      originUrl,
      timestamp
    );
  }

  // Web request events
  //
  // - new loading document
  // - onRequestOpen
  // - onRequestResponse

  onNewLoadingDocument(windowTreeInformation, originUrl, timestamp) {
    this.getPage(windowTreeInformation, originUrl).onNewLoadingDocument(
      windowTreeInformation,
      originUrl,
      timestamp
    );
  }

  onRequestOpen(windowTreeInformation, originUrl, timestamp, payload) {
    // payload: { originUrl, sourceUrl, cpt, isAd }
    this.getPage(windowTreeInformation, originUrl).onRequestOpen(
      windowTreeInformation,
      originUrl,
      timestamp,
      payload
    );
  }

  onRequestResponse(windowTreeInformation, originUrl, timestamp, payload) {
    // payload: { url, sourceUrl, cpt, headers }
    this.getPage(windowTreeInformation, originUrl).onRequestResponse(
      windowTreeInformation,
      originUrl,
      timestamp,
      payload
    );
  }

  // Process script events
  //
  // - iframe detected
  // - ad clicked (only for green ads)
  // - ad shown   (only for green ads)
  // - ad over    (green ads + approx for normal ads)

  onNewFrame(windowTreeInformation, originUrl, timestamp, payload) {
    const page = this.getPage(windowTreeInformation, originUrl);
    page.onNewFrame(
      windowTreeInformation,
      originUrl,
      timestamp,
      payload
    );

    // Detect iframes with canvas, from allowed ad servers;
    payload.iframes.forEach((iframe) => {
      if (!page.processedFrames.has(iframe.windowTreeInformation.outerWindowID)) {
        page.processedFrames.add(iframe.windowTreeInformation.outerWindowID);

        // Check href from advertiser
        for (let i = 0; i < iframe.hrefs.length; i += 1) {
          const href = iframe.hrefs[i];
          if (this.isFromAllowedAdvertiser(href)) {
            page.onAdShown(iframe.windowTreeInformation, href, Date.now(), {
              kind: 'sponsoredLink',
              parents: iframe.parents,
            });
            return;
          }
        }

        // Check the presence of a canvas in the iframe
        if (iframe.hasCanvas &&
            iframe.src &&
            this.isFromAllowedAdvertiser(iframe.src)) {
          page.onAdShown(iframe.windowTreeInformation, iframe.src, Date.now(), {
            kind: 'canvas',
            parents: iframe.parents,
          });
        }
      }
    });
  }

  onAdClicked(windowTreeInformation, originUrl, url, timestamp) {
    this.getPage(windowTreeInformation, originUrl).onAdClicked(
      windowTreeInformation,
      originUrl,
      url,
      timestamp,
    );
  }

  onAdShown(windowTreeInformation, originUrl, url, timestamp) {
    this.getPage(windowTreeInformation, originUrl).onAdShown(
      windowTreeInformation,
      url,
      timestamp,
    );
  }

  onAdOver(windowTreeInformation, originUrl, url, timestamp) {
    this.getPage(windowTreeInformation, originUrl).onAdOver(
      windowTreeInformation,
      originUrl,
      url,
      timestamp,
    );
  }
}
