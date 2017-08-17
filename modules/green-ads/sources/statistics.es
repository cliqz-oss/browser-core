/* eslint-disable no-use-before-define */

import background from './background';
import logger from './logger';
import moment from '../platform/moment';
import { sanitiseUrl } from './utils';


/**
 * Defines a page load. (URL + Tab ID)
 */
export default class PageLoad {
  constructor(windowTreeInformation, originUrl, greenMode) {
    logger.debug(`new PageLoad ${JSON.stringify(windowTreeInformation)} ${originUrl}`);
    // Create document tree data structure. It will keep track of various
    // statistics about the current loading page.
    this.outerWindowID = windowTreeInformation.outerWindowID;
    this.originUrl = originUrl;

    this.greenMode = greenMode;

    // Timings
    this.loadingStarts = Date.now();
    this.mainDocumentLoad = null;
    this.DOMCreated = null;
    this.DOMLoaded = null;
    this.fullLoad = null;

    // Updated by the parent Session object every time there is an event.
    this.lastActivity = Date.now();

    // Ad performance on this page
    this.adShown = [];
    this.adOver = [];
    this.adClicked = [];

    // User activity
    this.userActivity = [];

    // Frames

    // Frame for the main document
    this.mainFrame = new FrameContext(windowTreeInformation, 6, false);

    // Mapping of existing frames
    this.frames = Object.create(null);
    this.frames[windowTreeInformation.outerWindowID] = this.mainFrame;
  }

  aggregate() {
    return {
      version: 2,
      ts: moment().format('YYYYMMDD'),
      green: this.greenMode,
      url: sanitiseUrl(this.originUrl),
      timings: {
        // Relative timings
        timeToMainDocument: this.mainDocumentLoad - this.loadingStarts,
        timeToDOMCreated: this.DOMCreated - this.loadingStarts,
        timeToDOMLoaded: this.DOMLoaded - this.loadingStarts,
        timeToFullLoad: this.fullLoad - this.loadingStarts,
        timeToLastActivity: this.lastActivity - this.loadingStarts,
      },
      ads: {
        adShown: this.adShown,
        adOver: this.adOver,
        adClicked: this.adClicked,
      },
      loading: {
        numberOfRequests: this.getNumberOfRequestsForPage(),
        totalContentLength: this.totalContentLength(),
      },
      activity: this.userActivity.map(ev => ev.action).reduce((hash, item) => {
        /* eslint-disable no-param-reassign */
        if (!hash[item]) {
          hash[item] = 0;
        }
        hash[item] += 1;
        return hash;
      }, Object.create(null)),
    };
  }

  /* Frames book-keeping
   *
   *
   */

  forEachFrame(cb) {
    Object.keys(this.frames).forEach((originUrl) => {
      cb(this.frames[originUrl]);
    });
  }

  hasFrame(outerWindowID) {
    return this.frames[outerWindowID] !== undefined;
  }

  getFrame(outerWindowID) {
    return this.frames[outerWindowID];
  }

  setFrame({ originWindowID, outerWindowID, parentWindowID }, frameContext) {
    let parentFrame = this.frames[parentWindowID];
    if (frameContext.src === 'about:srcdoc') {
      // TODO - here we might need to have the full list of window ids to the
      // top and take the first that is different from `outerWindowID`.
      parentFrame = this.frames[originWindowID];
    }

    if (parentFrame === undefined) {
      logger.error(`DocumentTree ERROR no parent frame ${parentWindowID} available: ${JSON.stringify(Object.keys(this.frames))}`);
      return frameContext;
    }

    // Inherit the wouldBeBlocked attribute from parent to child
    if (parentFrame.wouldBeBlocked && !frameContext.wouldBeBlocked) {
      frameContext.wouldBeBlocked = true;
    }

    parentFrame.children[outerWindowID] = frameContext;
    this.frames[outerWindowID] = frameContext;

    return frameContext;
  }

  /* Accumulators - get global information on page.
   */

  getNumberOfRequestsForPage() {
    let numberOfRequests = this.mainFrame.getNumberOfRequests();

    this.mainFrame.forEachDescendant((frame) => {
      numberOfRequests += frame.getNumberOfRequests();
    });

    return numberOfRequests;
  }

  totalContentLength() {
    return this.mainFrame.totalContentLength();
  }

  getNumberOfAds() {
    return this.mainFrame.getNumberOfAds();
  }

  get loadingEnds() {
    return this.lastActivity;
  }

  /* Activity listeners
   *
   */

  onUserActivity(windowTreeInformation, originUrl, timestamp, action) {
    this.userActivity.push({
      action,
      timestamp,
    });
  }

  onDOMCreated(windowTreeInformation, originUrl, timestamp) {
    this.DOMCreated = timestamp;
  }

  onDOMLoaded(windowTreeInformation, originUrl, timestamp) {
    this.DOMLoaded = timestamp;
  }

  onFullLoad(windowTreeInformation, originUrl, timestamp) {
    this.fullLoad = timestamp;
  }

  onAdShown(windowTreeInformation, originUrl, url, timestamp) {
    logger.debug(`adShown ${JSON.stringify(windowTreeInformation)} ${url} ${timestamp}`);
    // Signal ad shown to background
    background.actions.highlightAd(windowTreeInformation.outerWindowID);

    this.adShown.push({
      timestamp,
      timeToLoad: timestamp - this.loadingStarts,
      url: sanitiseUrl(url),
      native: windowTreeInformation.originWindowID === windowTreeInformation.outerWindowID,
    });
  }

  onAdOver(windowTreeInformation, originUrl, url, timestamp) {
    logger.debug(`adOver ${JSON.stringify(windowTreeInformation)} ${originUrl} ${url} ${timestamp}`);
    this.adOver.push({
      timestamp,
      timeToOver: timestamp - this.loadingStarts,
      url: sanitiseUrl(url),
    });
  }

  onAdClicked(windowTreeInformation, originUrl, url, timestamp) {
    logger.debug(`adClicked ${JSON.stringify(windowTreeInformation)} ${originUrl} ${url} ${timestamp}`);
    this.adClicked.push({
      timestamp,
      timeToClick: timestamp - this.loadingStarts,
      url: sanitiseUrl(url),
    });
  }

  onNewLoadingDocument(windowTreeInformation, originUrl, timestamp) {
    this.mainDocumentLoad = timestamp;

    // Create request context for main loading document
    const frameContext = this.getFrame(windowTreeInformation.outerWindowID);
    frameContext.setRequest(
      originUrl,
      new RequestContext(originUrl, 6, false),
    );
  }

  /**
   * This method is called when the process script detected the creation of a
   * new window for a given document. We then try to attach the new information
   * to existing frames.
   */
  onNewFrame(windowTreeInformation, originUrl, timestamp, payload) {
    const { mainFrame, iframes, url } = payload;
    const {
      originWindowID,
      outerWindowID,
    } = windowTreeInformation;

    logger.debug(`newFrame ${JSON.stringify({
      windowTreeInformation,
      payload,
      originUrl,
      timestamp,
    })}`);

    // Update iframe metadata found in content script
    if (outerWindowID !== originWindowID) {
      // If the frame does not exist, we create it
      if (!this.hasFrame(outerWindowID)) {
        // TODO - wouldBeBlocked should be inherited from the parent frame
        const newFrame = this.setFrame(
          windowTreeInformation,
          new FrameContext(windowTreeInformation, url, false));
        this.setFrame(windowTreeInformation, newFrame);
      }

      // Update iframe metadata found in content script
      const frameContext = this.getFrame(outerWindowID);
      frameContext.iframe = Object.assign(frameContext.iframe, mainFrame);
    }

    // Attach iframes informations into the frames tree (this can be useful if
    // some iframes were present in the HTML and not created by any request).
    iframes.forEach((iframe) => {
      const { outerWindowID: iframeOuterWindowID } = iframe.windowTreeInformation;

      if (!this.hasFrame(iframeOuterWindowID)) {
        // It happens that no request has been made yet for a frame (but it can
        // come later), hence we create the frame now and it will be updated in
        // the observer.
        logger.debug(`create new iframe from static ${JSON.stringify(iframe)}`);
        this.setFrame(
          iframe.windowTreeInformation,
          new FrameContext(iframe.windowTreeInformation, iframe.src, false));
      }

      // Update metadata of iframe
      const frameContext = this.getFrame(iframeOuterWindowID);
      frameContext.iframe = Object.assign(frameContext.iframe, iframe);
    });
  }

  onRequestOpen(windowTreeInformation, originUrl, timestamp, payload) {
    const { outerWindowID } = windowTreeInformation;
    const {
      url,
      cpt,
      wouldBeBlocked,
    } = payload;

    // Create a new frame if needed
    if (!this.hasFrame(outerWindowID)) {
      this.setFrame(
        windowTreeInformation,
        new FrameContext(windowTreeInformation, url, wouldBeBlocked));
    }

    // Get current frame context
    const frameContext = this.getFrame(outerWindowID);

    // Check if the frame was created before the request was made (which can
    // happen if it's from a static iframe: ie it was specified in the HTML)
    if (!frameContext.url) {
      frameContext.url = url;
    }

    // Create a new context for the current request
    const requestContext = frameContext.setRequest(
      url,
      new RequestContext(url, cpt, wouldBeBlocked)
    );

    // Check if the current frame is probably an ad
    if ((wouldBeBlocked || frameContext.wouldBeBlocked) &&
        frameContext.getNumberOfRequests() > 1 && (
          cpt !== 1 &&  // == OTHER
          cpt !== 3 &&  // == IMAGE (dealt with in response Observer)
          cpt !== 4 &&  // == STYLESHEET
          cpt !== 14 && // == FONT
          cpt !== 2 &&  // == SCRIPT
          cpt !== 11 && // == XMLHTTPREQUEST
          cpt !== 19 && // == BEACON
          cpt !== 7)) { // == SUBDOCUMENT
      requestContext.isAd = true;

      // Register a adShown event
      logger.debug(`shown ad from open ${JSON.stringify({
        windowTreeInformation,
        payload,
        originUrl,
      })}`);

      // Collect link considered part of an ad
      frameContext.adLinks.push(url);

      // If we are in the main window, we can count several ads
      if (frameContext.isMainFrame) {
        // Only count iframe ads
        // this.onAdShown(windowTreeInformation, originUrl, timestamp, url);
      } else if (!frameContext.isAd) {
        // Only count one ad per iframe
        frameContext.isAd = true;
        this.onAdShown(windowTreeInformation, originUrl, url, timestamp);
      }
    }
  }

  onRequestResponse(windowTreeInformation, originUrl, timestamp, payload) {
    const { outerWindowID } = windowTreeInformation;
    const {
      cpt,
      headers,
      isCached,
      sourceUrl,
      url,
      wouldBeBlocked,
      isFromTracker,
    } = payload;

    if (!this.hasFrame(outerWindowID)) {
      logger.error(`ERROR frame not found: ${outerWindowID}`);
      return;
    }

    const frameContext = this.getFrame(outerWindowID);

    // Refresh last activity
    frameContext.endLoad = Date.now();

    // Extract content size if present
    let contentLength = 0;
    for (let i = 0; i < headers.length; i += 1) {
      const header = headers[i];
      if (header.name === 'Content-Length') {
        contentLength = Number(header.value);
        break;
      }
    }

    if (!frameContext.hasRequest(url)) {
      if (cpt === 7) {
        // This case could be that the `iframe` is present in the HTML and not
        // created by a request. Hence we never see it in the request opener.
        logger.debug(`[observeResponse] created new frame/request: ${JSON.stringify({
          url,
          originUrl,
          sourceUrl,
          cpt,
          headers,
          windowTreeInformation,
        })}`);

        const newFrame = this.setFrame(
          windowTreeInformation,
          new FrameContext(windowTreeInformation, url, wouldBeBlocked));

        const newRequest = newFrame.setRequest(
          url,
          new RequestContext(url, cpt, wouldBeBlocked));

        newRequest.contentLength = contentLength;
        return;
      }

      logger.debug(`[observeResponse] request not found: ${JSON.stringify({
        url,
        originUrl,
        sourceUrl,
        cpt,
        headers,
        windowTreeInformation,
      })}`);
      return;
    }

    // Update metadata for this URL
    const requestContext = frameContext.getRequest(url);
    if (!isCached) {
      requestContext.contentLength = contentLength;
    }
    requestContext.isCached = isCached;

    // If it's an image, check if it's a tracking pixel
    if (cpt === 3) {
      if (contentLength > 1000 || contentLength === undefined) {
        logger.debug(`image found ${contentLength} ${cpt} ${url}`);

        // NOTE: We also take into account missing content length as a tracking
        // pixel would probably never be cached.
        if (frameContext.isMainFrame) {
          if (isFromTracker) {
            logger.debug(`shown ad from response (main doc) ${JSON.stringify({
              windowTreeInformation,
              payload,
              originUrl,
            })}`);
            this.onAdShown(windowTreeInformation, originUrl, url, timestamp);
          }
        } else if (requestContext.wouldBeBlocked || frameContext.wouldBeBlocked) {
          requestContext.isAd = true;
          requestContext.isTrackingPixel = false;

          logger.debug(`shown ad from response ${JSON.stringify({
            windowTreeInformation,
            payload,
            originUrl,
          })}`);

          // Collect link considered part of an ad
          frameContext.adLinks.push(url);

          if (!frameContext.isAd) {
            frameContext.isAd = true;
            this.onAdShown(windowTreeInformation, originUrl, url, timestamp);
          }
        }
      } else {
        requestContext.isTrackingPixel = true;
        logger.debug(`probably pixel ${contentLength} ${url}`);
      }
    }
  }
}


/* Keeps track of metadata on a specific iframe (or main document window)
 */
class FrameContext {
  constructor({ outerWindowID, parentWindowID }, url, wouldBeBlocked) {
    logger.debug(`new FrameContext ${outerWindowID} ${url} ${wouldBeBlocked}`);

    this.src = url;
    this.outerWindowID = outerWindowID;
    this.parentWindowID = parentWindowID;
    this.isMainFrame = outerWindowID === parentWindowID;

    this.iframe = Object.create(null);
    this.wouldBeBlocked = wouldBeBlocked;

    // TODO - when a frame is classified as an ad, then it would be nice to send
    // back the information to the process script, so that we can visualize the
    // ads on the page. We could for example apply some transparency or flashy
    // color (red). It would help debug.
    //
    // To do so, we should follow the steps:
    // - windowId used in process script should be the actual originWindowID
    // - on isAd === true, an event should be triggered and the background
    // should be informed
    // - the background should send a message to the process script containing
    // the id of the frame.
    // - the frame should apply some CSS to visualize
    this.isAd = false;
    this.adLinks = [];

    this.startLoad = Date.now();
    this.endLoad = Date.now();

    // Requests made from this iframe
    this.requests = Object.create(null);

    // Children iframes
    this.children = Object.create(null);
  }

  /* Aggregated information on this frame and descendants
   */

  aggregate() {
    const result = {
      iframe: this.iframe,
      url: this.url,
      isAd: this.isAd,
      adLinks: this.adLinks,
      numberOfAds: this.getNumberOfAds(),
      loadingTime: (this.endLoad - this.startLoad) / 1000,
      contentLength: this.contentLength,
      requests: {},
      children: {},
    };

    // Add requests
    this.forEachRequest((request, url) => {
      result.requests[url] = request.aggregate();
    });

    // Add children
    this.forEachChild((child, url) => {
      result.children[url] = child.aggregate();
    });

    return result;
  }

  getNumberOfAds() {
    let numberOfAds = 0;

    this.forEachRequest((request) => {
      // if (request.isAd) {
      if (request.isAd) {
        numberOfAds += 1;
      }
    });

    this.forEachDescendant((frame) => {
      numberOfAds += frame.getNumberOfAds();
    });

    return numberOfAds;
  }

  totalContentLength() {
    let contentLength = 0;

    this.forEachRequest((request) => {
      if (request.contentLength) {
        contentLength += request.contentLength;
      }
    });

    this.forEachDescendant((frame) => {
      contentLength += frame.totalContentLength();
    });

    return contentLength;
  }

  /* Children frames accessors
   */

  getNumberOfChildren() {
    return Object.keys(this.children).length;
  }

  forEachChild(cb) {
    Object.keys(this.children).forEach((url) => {
      cb(this.children[url], url);
    });
  }

  forEachDescendant(cb) {
    this.forEachChild((child) => {
      cb(child);
      child.forEachDescendant(cb);
    });
  }

  /* Request frames accessors
   */

  getNumberOfRequests() {
    return Object.keys(this.requests).length;
  }

  forEachRequest(cb) {
    Object.keys(this.requests).forEach((url) => {
      cb(this.requests[url], url);
    });
  }

  hasRequest(url) {
    return this.requests[url] !== undefined;
  }

  getRequest(url) {
    return this.requests[url];
  }

  setRequest(url, requestContext) {
    this.requests[url] = requestContext;
    return requestContext;
  }
}


/* Keep track of metadata on a request
 */
class RequestContext {
  constructor(url, cpt, wouldBeBlocked) {
    logger.debug(`new RequestContext ${url} ${cpt} ${wouldBeBlocked}`);
    this.url = url;
    this.cpt = cpt;
    this.wouldBeBlocked = wouldBeBlocked;

    // Will be set either on request open, or headers received
    this.isCached = null;

    this.isAd = false;
    this.isTrackingPixel = false;
    this.contentLength = 0;
  }

  aggregate() {
    return {
      url: this.url,
      cpt: this.cpt,
      isAd: this.isAd,
      wouldBeBlocked: this.wouldBeBlocked,
      isTrackingPixel: this.isTrackingPixel,
      contentLength: this.contentLength,
    };
  }
}
