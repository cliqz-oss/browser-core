/* eslint-disable no-use-before-define */

import logger from './logger';
import moment from '../platform/lib/moment';
import background from './background';
import { sanitiseUrl, sanitiseParents } from './utils';


/**
 * Defines a page load. (URL + Tab ID)
 */
export default class PageLoad {
  constructor(windowTreeInformation, tabUrl, greenMode) {
    logger.debug('new PageLoad', windowTreeInformation, tabUrl);
    // Create document tree data structure. It will keep track of various
    // statistics about the current loading page.
    this.frameId = windowTreeInformation.frameId;
    this.tabUrl = tabUrl;

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
    this.whitelistedFrames = new Set();

    // Frame for the main document
    this.mainFrame = new FrameContext(windowTreeInformation, 6, false);

    // Mapping of existing frames
    this.frames = Object.create(null);
    this.frames[windowTreeInformation.frameId] = this.mainFrame;
  }

  aggregate() {
    return {
      version: 2,
      ts: moment().format('YYYYMMDD'),
      green: this.greenMode,
      url: sanitiseUrl(this.tabUrl),
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

    while (currentFrame.frameId !== this.frameId) {
      parents.push({
        id: currentFrame.frameId,
        url: currentFrame.src,
      });

      // Go up one level
      const parentID = currentFrame.parentFrameId;
      if (!parentID) break;
      currentFrame = this.getFrame(parentID);
    }

    parents.push({
      id: this.frameId,
      url: this.tabUrl,
    });

    return parents;
  }

  forEachFrame(cb) {
    Object.keys(this.frames).forEach((url) => {
      cb(this.frames[url]);
    });
  }

  hasFrame(frameId) {
    return this.frames[frameId] !== undefined;
  }

  getFrame(frameId) {
    return this.frames[frameId];
  }

  setFrame({ tabId, frameId, parentFrameId }, frameContext) {
    let parentFrame = this.frames[parentFrameId];
    if (frameContext.src === 'about:srcdoc') {
      // TODO - here we might need to have the full list of window ids to the
      // top and take the first that is different from `frameId`.
      parentFrame = this.frames[tabId];
    }

    this.frames[frameId] = frameContext;

    if (parentFrame === undefined) {
      logger.error('DocumentTree ERROR no parent frame available', parentFrameId, Object.keys(this.frames));
      return frameContext;
    }

    // Inherit the isAdvertiser attribute from parent to child
    if (parentFrame.isAdvertiser && !frameContext.isAdvertiser) {
      frameContext.isAdvertiser = true;
    }

    if (parentFrame.isAd) {
      frameContext.isAd = true;
    }

    parentFrame.children[frameId] = frameContext;

    return frameContext;
  }

  makeFrames(ids) {
    let currentID = ids[ids.length - 1].id;
    const tabId = currentID;
    let nextID;
    let nextUrl;

    if (!this.hasFrame(currentID)) {
      logger.error('Could not find origin frame in makeFrames', ids);
    }

    for (let i = ids.length - 2; i >= 0; i -= 1) {
      nextID = ids[i].id;
      nextUrl = ids[i].url;
      if (nextID !== currentID) {
        if (!this.hasFrame(nextID)) {
          const windowTreeInformation = {
            tabId,
            parentFrameId: currentID,
            frameId: nextID,
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

  onUserActivity(windowTreeInformation, tabUrl, timestamp, action) {
    this.userActivity.push({
      action,
      timestamp,
    });
  }

  onDOMCreated(windowTreeInformation, tabUrl, timestamp) {
    this.DOMCreated = timestamp;
  }

  onDOMLoaded(windowTreeInformation, tabUrl, timestamp) {
    this.DOMLoaded = timestamp;
  }

  onFullLoad(windowTreeInformation, tabUrl, timestamp) {
    this.fullLoad = timestamp;
  }

  onAdShown(windowTreeInformation, url, timestamp, extra) {
    const frame = this.getFrame(windowTreeInformation.frameId);

    if (!frame.isAd) {
      // Do not count the main document as an ad
      if (windowTreeInformation.tabId !== windowTreeInformation.frameId) {
        frame.isAd = true;
        frame.forEachDescendant((f) => { f.isAd = true; });
      }

      // Collect link considered part of an ad
      frame.adLinks.push(url);

      // Signal ad shown to background
      background.actions.highlightAd(windowTreeInformation.frameId);

      const payload = Object.assign({
        timestamp,
        timeToLoad: timestamp - this.loadingStarts,
        url: sanitiseUrl(url),
        mainFrame: windowTreeInformation.tabId === windowTreeInformation.frameId,
      }, extra);
      payload.parents = sanitiseParents(payload.parents || []);

      logger.log('adShown', payload);
      this.adShown.push(payload);
    }
  }

  onAdOver(windowTreeInformation, tabUrl, url, timestamp) {
    logger.debug('adOver', windowTreeInformation, tabUrl, url, timestamp);
    this.adOver.push({
      timestamp,
      timeToOver: timestamp - this.loadingStarts,
      url: sanitiseUrl(url),
    });
  }

  onAdClicked(windowTreeInformation, tabUrl, url, timestamp) {
    logger.log('adClicked', windowTreeInformation, tabUrl, url, timestamp);
    this.adClicked.push({
      timestamp,
      timeToClick: timestamp - this.loadingStarts,
      url: sanitiseUrl(url),
    });
  }

  /**
   * This method is called when the process script detected the creation of a
   * new window for a given document. We then try to attach the new information
   * to existing frames.
   */
  onNewFrame(windowTreeInformation, tabUrl, timestamp, payload) {
    const { parents, iframes, url } = payload;
    const {
      tabId,
      frameId,
    } = windowTreeInformation;

    logger.debug('newFrame', {
      windowTreeInformation,
      payload,
      tabUrl,
      timestamp,
    });

    // Update iframe metadata found in content script
    if (frameId !== tabId) {
      this.makeFrames(parents);
      const frame = this.getFrame(frameId);
      frame.src = url;
    }

    // Attach iframes informations into the frames tree (this can be useful if
    // some iframes were present in the HTML and not created by any request).
    iframes.forEach((iframe) => {
      // Create intermediary frames if needed
      this.makeFrames(iframe.parents);
      const frame = this.getFrame(iframe.windowTreeInformation.frameId);

      // Update metadata of the iframe
      frame.src = iframe.src;
      frame.hasCanvas = iframe.hasCanvas;
    });
  }

  onRequestOpen(windowTreeInformation, tabUrl, timestamp, payload) {
    const { frameId } = windowTreeInformation;
    const {
      url,
      cpt,
      isAdvertiser,
    } = payload;

    let frameContext;

    // Create a new frame if needed
    if (!this.hasFrame(frameId)) {
      frameContext = this.setFrame(
        windowTreeInformation,
        new FrameContext(windowTreeInformation, url, isAdvertiser));
    } else {
      // Update metadata
      frameContext = this.getFrame(frameId);
      frameContext.isAdvertiser = isAdvertiser;
      frameContext.src = url;
    }

    // Create a new context for the current request
    const requestContext = frameContext.setRequest(
      url,
      new RequestContext(url, cpt, isAdvertiser)
    );

    // Check if the current frame is probably an ad
    if (
      (isAdvertiser || frameContext.isAdvertiser) &&
      frameContext.getNumberOfRequests() > 1 &&
      (
        cpt !== 1 && // == OTHER
        cpt !== 3 && // == IMAGE (dealt with in response Observer)
        cpt !== 4 && // == STYLESHEET
        cpt !== 14 && // == FONT
        cpt !== 2 && // == SCRIPT
        cpt !== 11 && // == XMLHTTPREQUEST
        cpt !== 19 && // == BEACON
        cpt !== 7)
    ) { // == SUBDOCUMENT
      requestContext.isAd = true;

      // Register a adShown event
      logger.debug('shown ad from open', {
        windowTreeInformation,
        payload,
        tabUrl,
      });

      // If we are in the main window, we can count several ads
      if (frameContext.isMainFrame) {
        // Only count iframe ads
        // this.onAdShown(windowTreeInformation, tabUrl, timestamp, url);
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

  onRequestResponse(windowTreeInformation, tabUrl, timestamp, payload) {
    const { frameId } = windowTreeInformation;
    const {
      cpt,
      headers,
      isCached,
      url,
      isAdvertiser,
      isAdvertiserFrame,
    } = payload;

    const frameContext = this.getFrame(frameId);

    // Refresh last activity
    frameContext.endLoad = Date.now();

    // Extract content type to be sure it's an image
    let contentType;
    for (let i = 0; i < headers.length; i += 1) {
      const header = headers[i];
      if (header.name.toLowerCase() === 'content-type') {
        contentType = header.value;
        break;
      }
    }

    // Extract content size if present
    let contentLength = 0;
    for (let i = 0; i < headers.length; i += 1) {
      const header = headers[i];
      if (header.name.toLowerCase() === 'content-length') {
        contentLength = Number(header.value);
        break;
      }
    }

    if (cpt === 6) {
      return;
    }

    if (!frameContext.hasRequest(url)) {
      if (cpt === 7) {
        // This case could be that the `iframe` is present in the HTML and not
        // created by a request. Hence we never see it in the request opener.
        logger.log('[observeResponse] created new frame/request', url, windowTreeInformation, payload);

        const newFrame = this.setFrame(
          windowTreeInformation,
          new FrameContext(windowTreeInformation, url, isAdvertiser));

        const newRequest = newFrame.setRequest(
          url,
          new RequestContext(url, cpt, isAdvertiser));

        newRequest.contentLength = contentLength;
        return;
      }

      logger.error('[observeResponse] request not found', url, windowTreeInformation, payload);
      return;
    }

    // Update metadata for this URL
    const requestContext = frameContext.getRequest(url);
    requestContext.isCached = isCached;
    if (!isCached) {
      requestContext.contentLength = contentLength;
    }

    if (cpt === 3 && contentType !== undefined && !contentType.startsWith('image')) {
      logger.log('cpt is 3 but not image', contentType, url, payload);
      return;
    }

    // If it's an image, check if it's a tracking pixel
    if (cpt === 3) {
      if (contentLength >= 1000) {
        logger.log(`image found ${contentLength} ${cpt} ${url}`);

        // Hacky tracking pixel removal
        // NOTE - at the moment, some of them can be seen as ad (because they are
        // actually pretty big...)
        if (url.indexOf('1x1-transparent.gif') !== -1 ||
            url.indexOf('1x1_default.gif') !== -1 ||
            url.indexOf('1x1_Pixel.png') !== -1) {
          requestContext.isTrackingPixel = true;
          logger.log(`probably pixel ${contentLength} ${url}`);
          return;
        }

        // NOTE: We also take into account missing content length as a tracking
        // pixel would probably never be cached.
        if (frameContext.isMainFrame) {
          if (isAdvertiser) {
            logger.log('shown ad from response (main doc)', url, windowTreeInformation, payload);
            this.onAdShown(windowTreeInformation, url, timestamp, {
              // Extra
              kind: 'image',
              imageSize: contentLength,
              parents: [],
            });
          } else {
            logger.log('main frame img not ads?', url, isAdvertiser, cpt);
          }
        } else if (requestContext.isAdvertiser || isAdvertiserFrame) {
          requestContext.isAd = true;
          requestContext.isTrackingPixel = false;

          if (!frameContext.isAd) {
            logger.log('shown ad from response', url, windowTreeInformation, payload);
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
        if (contentLength > 100) {
          logger.log(`probably pixel ${contentLength} ${url}`, requestContext);
        }
      }
    }
  }
}


/* Keeps track of metadata on a specific iframe (or main document window)
 */
class FrameContext {
  constructor({ frameId, parentFrameId }, url, isAdvertiser) {
    logger.debug(`new FrameContext ${frameId} ${url} ${isAdvertiser}`);

    this.src = url;
    this.frameId = frameId;
    this.parentFrameId = parentFrameId;
    this.isMainFrame = frameId === parentFrameId;

    this.iframe = Object.create(null);
    this.isAdvertiser = isAdvertiser;

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
    this.requests[url] = requestContext;
    return requestContext;
  }
}


/* Keep track of metadata on a request
 */
class RequestContext {
  constructor(url, cpt, isAdvertiser) {
    logger.debug(`new RequestContext ${url} ${cpt} ${isAdvertiser}`);
    this.url = url;
    this.cpt = cpt;
    this.isAdvertiser = isAdvertiser;

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
      isAdvertiser: this.isAdvertiser,
      isTrackingPixel: this.isTrackingPixel,
      contentLength: this.contentLength,
    };
  }
}
