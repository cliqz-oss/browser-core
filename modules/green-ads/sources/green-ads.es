import WebRequest from '../core/webrequest';

import md5 from '../antitracking/md5';

import WebRequestContext from '../antitracking/webrequest-context';
import { AdBlocker } from '../adblocker/adblocker';

import PageLoad from './statistics';
import logger from './logger';
import SessionTracker from './sessions';
import { sanitiseUrl, extractGeneralDomain } from './utils';


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
    this.adblocker = new AdBlocker(
      true,
      { action() { return Promise.resolve(); } },
      false,
    );

    // Keep a mapping between URLs and tabIds
    this.tabIdToUrl = new Map();
    this.tabs = [];

    // Keep track of what window ids we consider as ads clicked
    // To avoid duplicate.
    this.adsClickedTabs = new Set();

    // Keep track of pages
    this.antitracking.action('getTabTracker').then((tabTracker) => {
      this.tabTracker = tabTracker;
      this.tabTracker.addEventListener('stage', (tabId, page) => {
        if (page.greenads) {
          const msg = page.greenads.aggregate();
          logger.debug(`Send telemetry for page ${msg.url}`, msg);
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
    if (this.greenMode && this.onBeforeRequestListener === undefined) {
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

    logger.debug(`onStateChange ${originUrl} ${triggeringUrl} ${JSON.stringify(windowTreeInformation)} tabs ${JSON.stringify(this.tabs)}`);

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
    if (this.isUrlFromTracker(originUrl) || this.isUrlFromTracker(triggeringUrl)) {
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

    if (this.greenMode) {
      // Exceptions:
      if (url.indexOf('amazon-adsystem.com/aax2/amzn_ads.js') !== -1) {
        // Unbreak video playing
        return {
          redirectUrl: 'data:application/javascript;base64,KGZ1bmN0aW9uKCkgewppZiAoIGFtem5hZHMgKSB7CnJldHVybjsKfQp2YXIgdyA9IHdpbmRvdzsKdmFyIG5vb3BmbiA9IGZ1bmN0aW9uKCkgewo7Cn0uYmluZCgpOwp2YXIgYW16bmFkcyA9IHsKYXBwZW5kU2NyaXB0VGFnOiBub29wZm4sCmFwcGVuZFRhcmdldGluZ1RvQWRTZXJ2ZXJVcmw6IG5vb3BmbiwKYXBwZW5kVGFyZ2V0aW5nVG9RdWVyeVN0cmluZzogbm9vcGZuLApjbGVhclRhcmdldGluZ0Zyb21HUFRBc3luYzogbm9vcGZuLApkb0FsbFRhc2tzOiBub29wZm4sCmRvR2V0QWRzQXN5bmM6IG5vb3BmbiwKZG9UYXNrOiBub29wZm4sCmRldGVjdElmcmFtZUFuZEdldFVSTDogbm9vcGZuLApnZXRBZHM6IG5vb3BmbiwKZ2V0QWRzQXN5bmM6IG5vb3BmbiwKZ2V0QWRGb3JTbG90OiBub29wZm4sCmdldEFkc0NhbGxiYWNrOiBub29wZm4sCmdldERpc3BsYXlBZHM6IG5vb3BmbiwKZ2V0RGlzcGxheUFkc0FzeW5jOiBub29wZm4sCmdldERpc3BsYXlBZHNDYWxsYmFjazogbm9vcGZuLApnZXRLZXlzOiBub29wZm4sCmdldFJlZmVycmVyVVJMOiBub29wZm4sCmdldFNjcmlwdFNvdXJjZTogbm9vcGZuLApnZXRUYXJnZXRpbmc6IG5vb3BmbiwKZ2V0VG9rZW5zOiBub29wZm4sCmdldFZhbGlkTWlsbGlzZWNvbmRzOiBub29wZm4sCmdldFZpZGVvQWRzOiBub29wZm4sCmdldFZpZGVvQWRzQXN5bmM6IG5vb3BmbiwKZ2V0VmlkZW9BZHNDYWxsYmFjazogbm9vcGZuLApoYW5kbGVDYWxsQmFjazogbm9vcGZuLApoYXNBZHM6IG5vb3BmbiwKcmVuZGVyQWQ6IG5vb3BmbiwKc2F2ZUFkczogbm9vcGZuLApzZXRUYXJnZXRpbmc6IG5vb3BmbiwKc2V0VGFyZ2V0aW5nRm9yR1BUQXN5bmM6IG5vb3BmbiwKc2V0VGFyZ2V0aW5nRm9yR1BUU3luYzogbm9vcGZuLAp0cnlHZXRBZHNBc3luYzogbm9vcGZuLAp1cGRhdGVBZHM6IG5vb3Bmbgp9Owp3LmFtem5hZHMgPSBhbXpuYWRzOwp3LmFtem5fYWRzID0gdy5hbXpuX2FkcyB8fCBub29wZm47CncuYWF4X3dyaXRlID0gdy5hYXhfd3JpdGUgfHwgbm9vcGZuOwp3LmFheF9yZW5kZXJfYWQgPSB3LmFheF9yZW5kZXJfYWQgfHwgbm9vcGZuOwp9KSgpOwo='
        };
      }

      if (url.indexOf('hd-main.js') !== -1) {
        // Unbreak video playing
        return {
          redirectUrl: 'data:application/javascript;base64,KGZ1bmN0aW9uKCl7CnZhciBsID0ge307CnZhciBub29wZm4gPSBmdW5jdGlvbigpIHsKOwp9Owp2YXIgcHJvcHMgPSBbCiIkaiIsIkFkIiwiQmQiLCJDZCIsIkRkIiwiRWQiLCJGZCIsIkdkIiwiSGQiLCJJZCIsIkpkIiwiTmoiLCJPYyIsIlBjIiwiUGUiLAoiUWMiLCJRZSIsIlJjIiwiUmUiLCJSaSIsIlNjIiwiVGMiLCJVYyIsIlZjIiwiV2MiLCJXZyIsIlhjIiwiWGciLCJZYyIsIllkIiwKImFkIiwiYWUiLCJiZCIsImJmIiwiY2QiLCJkZCIsImVkIiwiZWYiLCJlayIsImZkIiwiZmciLCJmaCIsImZrIiwiZ2QiLCJoZCIsCiJpZyIsImlqIiwiamQiLCJrZCIsImtlIiwibGQiLCJtZCIsIm1pIiwibmQiLCJvZCIsIm9oIiwicGQiLCJwZiIsInFkIiwicmQiLAoic2QiLCJ0ZCIsInVkIiwidmQiLCJ3ZCIsIndnIiwieGQiLCJ4aCIsInlkIiwiemQiLAoiJGQiLCIkZSIsIiRrIiwiQWUiLCJBZiIsIkFqIiwiQmUiLCJDZSIsIkRlIiwiRWUiLCJFayIsIkVvIiwiRXAiLCJGZSIsIkZvIiwKIkdlIiwiR2giLCJIayIsIkllIiwiSXAiLCJKZSIsIktlIiwiS2siLCJLcSIsIkxlIiwiTGgiLCJMayIsIk1lIiwiTW0iLCJOZSIsCiJPZSIsIlBlIiwiUWUiLCJSZSIsIlJwIiwiU2UiLCJUZSIsIlVlIiwiVmUiLCJWcCIsIldlIiwiWGQiLCJYZSIsIllkIiwiWWUiLAoiWmQiLCJaZSIsIlpmIiwiWmsiLCJhZSIsImFmIiwiYWwiLCJiZSIsImJmIiwiYmciLCJjZSIsImNwIiwiZGYiLCJkaSIsImVlIiwKImVmIiwiZmUiLCJmZiIsImdmIiwiZ20iLCJoZSIsImhmIiwiaWUiLCJqZSIsImpmIiwia2UiLCJrZiIsImtsIiwibGUiLCJsZiIsCiJsayIsIm1mIiwibWciLCJtbiIsIm5mIiwib2UiLCJvZiIsInBlIiwicGYiLCJwZyIsInFlIiwicWYiLCJyZSIsInJmIiwic2UiLAoic2YiLCJ0ZSIsInRmIiwidGkiLCJ1ZSIsInVmIiwidmUiLCJ2ZiIsIndlIiwid2YiLCJ3ZyIsIndpIiwieGUiLCJ5ZSIsInlmIiwKInlrIiwieWwiLCJ6ZSIsInpmIiwiemsiCl07CmZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsKbFtwcm9wc1tpXV0gPSBub29wZm47Cn0Kd2luZG93LkwgPSB3aW5kb3cuSiA9IGw7Cn0pKCk7Cg=='
        };
      }

      if (url.indexOf('1x1-transparent.gif') !== -1) {
        return {
          redirectUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
        };
      }

      if (url.indexOf('//www.kaltura.com') !== -1) {
        // Unbreak thumbnails
        return {};
      }

      // We are on a chip.de page now
      if (url.indexOf('chip.de') === -1) {
        return { cancel: true };
      }

      // Check host of the request
      const hostGD = extractGeneralDomain(url);
      if (hostGD !== 'chip.de') {
        return { cancel: true };
      }

      // NOTE - disabled blocking using adblocker for now and rely on custom
      // aggressive blocking for chip.de third party requests.
      // Try to match the current request with the adblocker
      // const result = this.adblocker.match(requestContext);

      // if (result.redirect) {
      //   return { redirectUrl: result.redirect };
      // } else if (result.match) {
      //   return { cancel: true };
      // }
    }

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
    const result = this.adblocker.match(requestContext);
    const wouldBeBlocked = (result.match || result.redirect) !== undefined;

    const cpt = requestContext.getContentPolicyType();
    const url = requestContext.url;

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
    const result = this.adblocker.match(requestContext);
    const wouldBeBlocked = (result.match || result.redirect) !== undefined;
    const isFromTracker = this.isUrlFromTracker(url);

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
    const page = this.tabTracker.getPageForTab(tabId) || {};

    // Create a new page if needed
    if (page.greenads === undefined) {
      page.greenads = new PageLoad(windowTreeInformation, originUrl, this.greenMode);
    }

    // Refresh last activity
    page.greenads.lastActivity = Date.now();

    return page.greenads;
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
    this.getPage(windowTreeInformation, originUrl).onNewFrame(
      windowTreeInformation,
      originUrl,
      timestamp,
      payload
    );
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
      originUrl,
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
