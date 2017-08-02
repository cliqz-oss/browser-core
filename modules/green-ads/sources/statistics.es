/* eslint-disable no-use-before-define */

import logger from './logger';
import moment from '../platform/moment';
import { sanitiseUrl, sanitiseParents } from './utils';


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

    // Keep track of processed iframes
    this.processedFrames = new Set();

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

  getParents(frame) {
    const parents = [];
    let currentFrame = frame;

    while (currentFrame.outerWindowID !== this.outerWindowID) {
      parents.push({
        id: currentFrame.outerWindowID,
        url: currentFrame.src,
      });

      // Go up one level
      const parentID = currentFrame.parentWindowID;
      if (!parentID) break;
      currentFrame = this.getFrame(parentID);
    }

    parents.push({
      id: this.outerWindowID,
      url: this.originUrl,
    });

    return parents;
  }

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

    this.frames[outerWindowID] = frameContext;

    if (parentFrame === undefined) {
      logger.error(`DocumentTree ERROR no parent frame ${parentWindowID} available: ${JSON.stringify(Object.keys(this.frames))}`);
      return frameContext;
    }

    // Inherit the wouldBeBlocked attribute from parent to child
    if (parentFrame.wouldBeBlocked && !frameContext.wouldBeBlocked) {
      frameContext.wouldBeBlocked = true;
    }

    if (parentFrame.isAd) {
      frameContext.isAd = true;
    }

    parentFrame.children[outerWindowID] = frameContext;

    return frameContext;
  }

  makeFrames(ids) {
    let currentID = ids[ids.length - 1].id;
    const originWindowID = currentID;
    let nextID;
    let nextUrl;

    if (!this.hasFrame(currentID)) {
      logger.error(`Could not find origin frame in makeFrames ${JSON.stringify(ids)}`);
    }

    for (let i = ids.length - 2; i >= 0; i -= 1) {
      nextID = ids[i].id;
      nextUrl = ids[i].url;
      if (nextID !== currentID) {
        if (!this.hasFrame(nextID)) {
          const windowTreeInformation = {
            originWindowID,
            parentWindowID: currentID,
            outerWindowID: nextID,
          };

          // Create a new frame
          this.setFrame(
            windowTreeInformation,
            new FrameContext(windowTreeInformation, nextUrl, false),
          );
        }
      }

      currentID = nextID;
    }
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

  onAdShown(windowTreeInformation, url, timestamp, extra) {
    const frame = this.getFrame(windowTreeInformation.outerWindowID);

    if (!frame.isAd) {
      // Do not count the main document as an ad
      if (windowTreeInformation.originWindowID !== windowTreeInformation.outerWindowID) {
        frame.isAd = true;
        frame.forEachDescendant((f) => { f.isAd = true; });
      }

      // Collect link considered part of an ad
      frame.adLinks.push(url);

      // Signal ad shown to background
      // background.actions.highlightAd(windowTreeInformation.outerWindowID);

      const payload = Object.assign({
        timestamp,
        timeToLoad: timestamp - this.loadingStarts,
        url: sanitiseUrl(url),
        mainFrame: windowTreeInformation.originWindowID === windowTreeInformation.outerWindowID,
      }, extra);
      payload.parents = sanitiseParents(payload.parents || []);

      logger.debug(`adShown ${JSON.stringify(payload)}`);
      this.adShown.push(payload);
    }
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
    const { parents, iframes, url } = payload;
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
      this.makeFrames(parents);
      const frame = this.getFrame(outerWindowID);
      frame.src = url;
    }

    // Attach iframes informations into the frames tree (this can be useful if
    // some iframes were present in the HTML and not created by any request).
    iframes.forEach((iframe) => {
      // Create intermediary frames if needed
      this.makeFrames(iframe.parents);
      const frame = this.getFrame(iframe.windowTreeInformation.outerWindowID);

      // Update metadata of the iframe
      frame.src = iframe.src;
      frame.hasCanvas = iframe.hasCanvas;
    });
  }

  onRequestOpen(windowTreeInformation, originUrl, timestamp, payload) {
    const { outerWindowID } = windowTreeInformation;
    const {
      url,
      cpt,
      wouldBeBlocked,
    } = payload;

    let frameContext;

    // Create a new frame if needed
    if (!this.hasFrame(outerWindowID)) {
      frameContext = this.setFrame(
        windowTreeInformation,
        new FrameContext(windowTreeInformation, url, wouldBeBlocked));
    } else {
      // Update metadata
      frameContext = this.getFrame(outerWindowID);
      frameContext.wouldBeBlocked = wouldBeBlocked;
      frameContext.src = url;
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

      // If we are in the main window, we can count several ads
      if (frameContext.isMainFrame) {
        // Only count iframe ads
        // this.onAdShown(windowTreeInformation, originUrl, timestamp, url);
      } else if (!frameContext.isAd) {
        // Only count one ad per iframe
        frameContext.isAd = true;
        this.onAdShown(windowTreeInformation, url, timestamp, {
          // Extra informations about the ad
          reason: 'requestOpen',
          parents: this.getParents(frameContext),
        });
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

        // Hacky tracking pixel removal
        // NOTE - at the moment, some of them can be seen as ad (because they are
        // actually pretty big...)
        if (url.indexOf('1x1-transparent.gif') !== -1 ||
            url.indexOf('1x1_default.gif') !== -1 ||
            url.indexOf('1x1_Pixel.png') !== -1) {
          requestContext.isTrackingPixel = true;
          logger.debug(`probably pixel ${contentLength} ${url}`);
          return;
        }

        // NOTE: We also take into account missing content length as a tracking
        // pixel would probably never be cached.
        if (frameContext.isMainFrame) {
          if (isFromTracker) {
            logger.debug(`shown ad from response (main doc) ${JSON.stringify({
              windowTreeInformation,
              payload,
              originUrl,
            })}`);
            this.onAdShown(windowTreeInformation, url, timestamp, {
              // Extra
              kind: 'image',
              imageSize: contentLength,
              parents: [],
            });
          }
        } else if (requestContext.wouldBeBlocked) {
          requestContext.isAd = true;
          requestContext.isTrackingPixel = false;

          logger.debug(`shown ad from response ${JSON.stringify({
            windowTreeInformation,
            payload,
            originUrl,
          })}`);

          if (!frameContext.isAd) {
            this.onAdShown(windowTreeInformation, url, timestamp, {
              // Extra
              kind: 'image',
              imageSize: contentLength,
              parents: this.getParents(frameContext),
            });
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
    return this.adLinks.length;
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
    logger.log(`setRequest ${url}`);
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
