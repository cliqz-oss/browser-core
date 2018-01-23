import md5 from '../antitracking/md5';

import { AdBlocker } from '../adblocker/adblocker';

import PageLoad from './statistics';
import logger from './logger';
import SessionTracker from './sessions';
import { isChipAdDependency } from './blocking';
import { isDoubleclick, isOutbrain } from './advertisers';
import { sanitiseUrl, extractDomain, extractGeneralDomain } from './utils';


export default class GreenAds {
  constructor(greenMode, antitracking, webRequestPipeline, sendTelemetry) {
    this.webRequestPipeline = webRequestPipeline;
    this.antitracking = antitracking;
    this.qsWhitelist = null;

    // Current state of green-ads module (green or normal?)
    this.greenMode = greenMode;

    // Create adblocker
    this.adblocker = new AdBlocker(
      { action() { return Promise.resolve(); } },
      { useCountryList: false }
    );

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
          logger.debug('Send telemetry for page', msg.url, msg);
          sendTelemetry({
            type: 'humanweb',
            action: 'greenads.page',
            payload: msg,
          });
        }
      });
    });

    this.sessions = new SessionTracker(['chip.de'], this.greenMode, sendTelemetry);
  }

  initListeners() {
    const promises = [];

    if (this.onBeforeRequestListener === undefined) {
      // onBeforeRequest will be used to block third party requests.
      this.onBeforeRequestListener = this.onBeforeRequest.bind(this);
      promises.push(this.webRequestPipeline.action('addPipelineStep',
        'open',
        {
          name: 'greenads.open',
          fn: this.onBeforeRequestListener,
        },
      ));
    }

    // onBeforeSendHeaders is used to collect statistics on requests.
    // We use this hook instead of onBeforeRequest because some events are not
    // captured by the former (eg: 302 moved temporarily).
    if (this.onBeforeSendHeadersListener === undefined) {
      this.onBeforeSendHeadersListener = this.onBeforeSendHeaders.bind(this);
      promises.push(this.webRequestPipeline.action('addPipelineStep',
        'modify',
        {
          name: 'greenads.modify',
          fn: this.onBeforeSendHeadersListener,
        },
      ));
    }

    // onHeadersReceived is used to collect statistics about responses.
    if (this.onHeadersReceivedListener === undefined) {
      this.onHeadersReceivedListener = this.onHeadersReceived.bind(this);
      promises.push(this.webRequestPipeline.action('addPipelineStep',
        'response',
        {
          name: 'greenads.response',
          fn: this.onHeadersReceivedListener,
        },
      ));
    }

    return Promise.all(promises);
  }

  unloadListeners() {
    const promises = [];

    if (this.onBeforeRequestListener) {
      promises.push(this.webRequestPipeline.action('removePipelineStep', 'open', 'greenads.open'));
      this.onBeforeRequestListener = undefined;
    }

    if (this.onBeforeSendHeadersListener) {
      promises.push(this.webRequestPipeline.action('removePipelineStep', 'modify', 'greenads.modify'));
      this.onBeforeSendHeadersListener = undefined;
    }

    if (this.onHeadersReceivedListener) {
      promises.push(this.webRequestPipeline.action('removePipelineStep', 'response', 'greenads.response'));
      this.onHeadersReceivedListener = undefined;
    }

    return Promise.all(promises);
  }

  initAdblocker() {
    return this.adblocker.init();
  }

  unloadAdblocker() {
    this.adblocker.unload();
  }

  init() {
    return Promise.all([
      this.sessions.init(),
      this.initListeners(),
      this.initAdblocker(),
      this.antitracking.action('getWhitelist')
        .then((qsWhitelist) => { this.qsWhitelist = qsWhitelist; }),
    ]);
  }

  unload() {
    return Promise.all([
      this.unloadAdblocker(),
      this.unloadListeners(),
      this.sessions.unload(),
    ]);
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

  wouldBeBlocked(url, sourceUrl, cpt = 6) {
    const result = this.adblocker.match({
      sourceUrl,
      url,
      cpt,
    });

    return (result.match || result.exception);
  }

  isProbablyAdvertiser(url, sourceUrl, cpt) {
    return (
      this.isFromAllowedAdvertiser(url) ||
      this.wouldBeBlocked(url, sourceUrl, cpt)
    );
  }

  isTrackerOrAdvertiser(url, sourceUrl, cpt) {
    return this.isProbablyAdvertiser(url, sourceUrl, cpt) || this.isUrlFromTracker(url);
  }

  /**
   * Check if we should register events coming from `url` (currently check if
   * the domain is chip.de.
   */
  shouldProceedWithUrl(url) {
    return extractGeneralDomain(url) === 'chip.de';
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
    const { tabId } = windowTreeInformation;

    const isCollectedPage = this.shouldProceedWithUrl(url);
    const event = {
      // The event always counts for the main document
      windowTreeInformation: {
        tabId,
        parentFrameId: tabId,
        frameId: tabId,
      },
      url,
      isCollectedPage,
      timestamp: Date.now(),
    };

    if (this.tabs.length === 0) {
      this.tabs.push(event);
    } else {
      const lastEvent = this.tabs[this.tabs.length - 1];
      if (lastEvent.windowTreeInformation.tabId !== tabId) {
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
      tabId,
      frameId,
    } = windowTreeInformation;
    logger.debug(`adCheck ${tabId} ${frameId} ${originUrl} ${triggeringUrl}`);

    // Only consider main documents
    if (tabId !== frameId) {
      logger.log(`adCheck should be main document only ${tabId} !== ${frameId}`);
      return;
    }

    if (!(originUrl || triggeringUrl)) {
      logger.log('adCheck !originUrl && !triggeringUrl');
      return;
    }

    const lastActiveTab = this.getLastActiveTab();
    if (lastActiveTab === null) {
      logger.log('adCheck lastActiveTab === null');
      return;
    }

    // Check if the tab is different
    if (tabId === lastActiveTab.windowTreeInformation.tabId) {
      logger.log(`adCheck tab is not different ${tabId} !== ${lastActiveTab.windowTreeInformation.tabId}`);
      return;
    }

    // Check if the latest active tab was from a collected domain
    if (!lastActiveTab.isCollectedPage) {
      logger.log('adCheck last tab is not collected', lastActiveTab);
      return;
    }

    // Check if the last user action was close enough
    if (lastActiveTab.timestamp < (Date.now() - 10000)) {
      logger.log('adCheck last action of user was too long ago', Date.now() - lastActiveTab.timestamp, lastActiveTab);
      return;
    }

    // Comes from a tab which we already count as ad click
    if (this.adsClickedTabs.has(tabId)) {
      logger.log('adCheck already count as an Ad');
      return;
    }

    // Check if the domain is a tracker, and consider this as an ad.
    const sourceUrl = lastActiveTab.url;
    if (this.isTrackerOrAdvertiser(originUrl, sourceUrl) ||
        this.isTrackerOrAdvertiser(triggeringUrl, sourceUrl)) {
      logger.log(`adCheck locationChange isAd ${tabId} ${originUrl} ${triggeringUrl}`);
      this.adsClickedTabs.add(tabId);
      this.onAdClicked(
        lastActiveTab.windowTreeInformation,
        lastActiveTab.url,
        originUrl,
        Date.now());
    } else {
      logger.log(`adCheck locationChange NOT AD ${tabId} ${originUrl} ${triggeringUrl}`);
    }
  }

  /* Web request listeners
   * =====================
   *
   * - on opened request
   * - on modify request
   * - on response
   */

  onBeforeRequest(state, response) {
    const tabUrl = state.sourceUrl;
    const url = state.url;
    const windowTreeInformation = {
      tabId: state.tabId,
      parentFrameId: state.parentFrameId,
      frameId: state.frameId,
    };

    // Only consider chip.de for this experiment
    if (!this.shouldProceedWithUrl(tabUrl)) {
      return true;
    }

    const host = extractDomain(url);
    const hostGD = extractGeneralDomain(url);
    const cpt = state.cpt;

    // Kill outbrain
    if (isOutbrain(hostGD)) {
      logger.log(`cancel ${url}`);
      response.block();
      return false;
    }

    // When in collect mode, we let a few ads through.
    if (!this.greenMode) {
      // Allow chip-deps?
      if (isChipAdDependency(host, hostGD)) {
        return true;
      }

      // Allow double-click
      const page = this.getPage(windowTreeInformation, tabUrl);
      if (page.whitelistedFrames.has(windowTreeInformation.frameId) ||
          page.whitelistedFrames.has(windowTreeInformation.parentFrameId)) {
        return true;
      } else if (isDoubleclick(hostGD)) {
        if (cpt === 7) {
          logger.debug('update whitelist 7', url, windowTreeInformation.frameId);
          page.whitelistedFrames.add(windowTreeInformation.frameId);
        }

        return true;
      }
    }

    if (cpt === 6) {
      return true;
    }

    // Apply the adblocker on the rest!
    const result = this.adblocker.match({
      sourceUrl: tabUrl,
      url,
      cpt,
    });

    if (result.redirect) {
      response.redirectTo(result.redirect);
      return false;
    } else if (result.match) {
      response.block();
      return false;
    }

    return true;
  }

  onBeforeSendHeaders(state) {
    const tabUrl = state.sourceUrl;
    const parentUrl = state.originUrl;
    const url = state.url;
    const cpt = state.cpt;
    const windowTreeInformation = {
      tabId: state.tabId,
      parentFrameId: state.parentFrameId,
      frameId: state.frameId,
    };

    // Only consider chip.de for this experiment
    if (!this.shouldProceedWithUrl(tabUrl)) {
      return true;
    }

    if (cpt === 6) {
      return true;
    }

    // Check what the adblocker would do for this request
    const isAdvertiser = this.isProbablyAdvertiser(url, tabUrl, cpt);

    // If we are in a subdocument, check if we should whitelist the iframe
    if (windowTreeInformation.tabId !== windowTreeInformation.frameId) {
      const page = this.getPage(windowTreeInformation, tabUrl);
      if (this.isFromAllowedAdvertiser(url)) {
        logger.debug('update whitelist 1', url, windowTreeInformation.frameId);
        page.whitelistedFrames.add(windowTreeInformation.frameId);
      } else if (this.isFromAllowedAdvertiser(parentUrl)) {
        logger.debug('update whitelist 2', parentUrl, windowTreeInformation.frameId, windowTreeInformation.parentFrameId, windowTreeInformation, state);
        page.whitelistedFrames.add(windowTreeInformation.frameId);
        if (windowTreeInformation.parentFrameId !== windowTreeInformation.tabId) {
          logger.debug('update whitelist 2', windowTreeInformation.parentFrameId);
          page.whitelistedFrames.add(windowTreeInformation.parentFrameId);
        }
      }
    }

    this.onRequestOpen(windowTreeInformation, tabUrl, Date.now(), {
      url,
      parentUrl,
      cpt,
      isAdvertiser,
    });

    return true;
  }

  onHeadersReceived(state) {
    const tabUrl = state.sourceUrl;
    const parentUrl = state.originUrl;
    const url = state.url;
    const cpt = state.type;
    const headers = state.responseHeaders;
    const windowTreeInformation = {
      tabId: state.tabId,
      parentFrameId: state.parentFrameId,
      frameId: state.frameId,
    };

    // Only consider chip.de for this experiment
    if (!this.shouldProceedWithUrl(tabUrl)) {
      return true;
    }

    const page = this.getPage(windowTreeInformation, tabUrl);

    const isAdvertiser = this.isProbablyAdvertiser(url, tabUrl, cpt);
    const isAdvertiserFrame = (
      state.tabId !== state.frameId && (
        page.whitelistedFrames.has(windowTreeInformation.frameId) ||
        page.whitelistedFrames.has(windowTreeInformation.parentFrameId)
      )
    );

    // Register statistics for this request
    this.onRequestResponse(windowTreeInformation, tabUrl, Date.now(), {
      url,
      parentUrl,
      cpt,
      headers,
      isAdvertiser,
      isAdvertiserFrame,
      isCached: state.isCached,
    });

    return true;
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

  hasPage({ tabId }) {
    const page = this.tabTracker.getPageForTab(tabId);
    return page !== undefined && page.greenads;
  }

  getPage(windowTreeInformation, originUrl) {
    const tabId = windowTreeInformation.tabId;
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
  // - onRequestOpen
  // - onRequestResponse

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

    // Check if one of the iframes is from double click or is a sub-iframe of a
    // doubleclick iframe and update the list of whitelisted iframes.
    payload.iframes.forEach((iframe) => {
      const windowId = iframe.windowTreeInformation.frameId;
      if (!page.whitelistedFrames.has(windowId)) {
        if (iframe.src && this.isFromAllowedAdvertiser(iframe.src)) {
          logger.debug(`found doubleclick iframe ${windowId}`);
          logger.debug('update whitelist 3', iframe.src, windowId);
          page.whitelistedFrames.add(windowId);
        } else if (iframe.id.startsWith('google_ads')) {
          logger.debug(`found doubleclick iframe ${windowId}`);
          logger.debug('update whitelist 4 (iframe id)', windowId);
          page.whitelistedFrames.add(windowId);
        } else {
          // Check all parents
          iframe.parents.forEach((parent) => {
            if (!page.whitelistedFrames.has(parent.id) &&
                this.isFromAllowedAdvertiser(parent.url)) {
              logger.debug('update whitelist 5', parent.url, parent.id);
              logger.debug(`found doubleclick iframe ${parent.id}`);
              page.whitelistedFrames.add(parent.id);
            }

            if (page.whitelistedFrames.has(parent.id)) {
              logger.debug(`found doubleclick iframe ${windowId}`);
              logger.debug('update whitelist 6', parent.id, windowId);
              page.whitelistedFrames.add(windowId);
            }
          });
        }
      }
    });

    page.onNewFrame(
      windowTreeInformation,
      originUrl,
      timestamp,
      payload
    );

    // Detect iframes with canvas, from allowed ad servers;
    payload.iframes.forEach((iframe) => {
      if (!page.processedFrames.has(iframe.windowTreeInformation.frameId)) {
        page.processedFrames.add(iframe.windowTreeInformation.frameId);

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
