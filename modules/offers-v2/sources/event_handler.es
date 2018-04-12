/*

This module will be used to handle different kind of events in a more efficient
way for the offers module.

*/

import logger from './common/offers_v2_logger';
import { utils, events } from '../core/cliqz';
import WebRequest from '../core/webrequest';
import UrlData from './common/url_data';


export default class EventHandler {
  constructor() {
    // the list of callbacks we will handle.
    this.urlChangeCbs = new Map();
    this.httpReqCbs = new Map();

    this.onTabLocChanged = this.onTabLocChanged.bind(this);

    events.sub('content:location-change', this.onTabLocChanged);

    this.beforeRequestListener = this.beforeRequestListener.bind(this);
    this.requestListenerAdded = false;

    // Don't execute triggers on localhost, IPs and "internal" urls
    this.notAllowedUrls = RegExp('(admin|login|logout|^https?://localhost|^https?://(\\d+\\.){3}\\d+|\\.(dev|foo)\\b)');
  }

  //
  // @brief destructor
  //
  destroy() {
    events.un_sub('content:location-change', this.onTabLocChanged);
    if (this.requestListenerAdded) {
      WebRequest.onCompleted.removeListener(this.beforeRequestListener);
      this.requestListenerAdded = false;
    }
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                          PUBLIC METHODS
  // ///////////////////////////////////////////////////////////////////////////

  //
  // @brief subscribe to get events whenever a new url is performed
  // @note
  //  The event emitted is a url details structure + referrer field (check
  //  utils.getDetailsFromUrl(url); for more info)
  //
  subscribeUrlChange(cb, cargs = null) {
    this.urlChangeCbs.set(cb, cargs);
  }
  unsubscribeUrlChange(cb) {
    this.urlChangeCbs.delete(cb);
  }

  //
  // @brief subscribe to get events for http requests (POST / GET) for particular
  //        domains
  // @param cb  The callback to receive the event
  // @param domainName The domain name that we want to get the callback.
  // @param cargs is the arguments that will be passed to the callback
  // @note The event structure will look like:
  //  {
  //    'req_obj' : x, // the request object containing the full info of it
  //  }
  //
  //
  subscribeHttpReq(cb, domainName, cargs = null) {
    if (!this.httpReqCbs.has(domainName)) {
      this.httpReqCbs.set(domainName, new Map());
    }

    // add the listener if not added before
    if (!this.requestListenerAdded) {
      this.requestListenerAdded = true;
      WebRequest.onCompleted.addListener(this.beforeRequestListener, {
        urls: ['http://*/*', 'https://*/*'],
      });
    }

    if (this.httpReqCbs.get(domainName).has(cb)) {
      return false;
    }

    this.httpReqCbs.get(domainName).set(cb, cargs);
    return true;
  }
  unsubscribeHttpReq(cb, domainName) {
    if (!this.httpReqCbs.has(domainName)) {
      return;
    }
    this.httpReqCbs.get(domainName).delete(cb);
  }

  isHttpReqDomainSubscribed(cb, domainName) {
    return this.httpReqCbs.has(domainName) && this.httpReqCbs.get(domainName).has(cb);
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                          PRIVATE METHODS
  // ///////////////////////////////////////////////////////////////////////////

  // ///////////////////////////////////////////////////////////////////////////
  onTabLocChanged(data) {
    // EX-2561: private mode then we don't do anything here
    if (data.isPrivate) {
      logger.info('window is private skipping: onTabLocChanged');
      return;
    }

    // We need to subscribe here to get events everytime the location is
    // changing and is the a new url. We had issues since everytime we switch
    // the tabs we got the event from core.locaiton_change and this is not correct
    // for our project.
    // Check issue https://cliqztix.atlassian.net/projects/GR/issues/GR-117
    //

    // skip the event if is the same document here
    // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener
    //
    if (data.isSameDocument) {
      return;
    }

    // we will do a further check here so we can avoid extra execution
    if (!data.url || data.url.length === 0 || this.lastUrl === data.url) {
      return;
    }

    this.lastUrl = data.url;

    // else we emit the event here
    this.onLocationChangeHandler(data.url, data.referrer);
  }

  // ///////////////////////////////////////////////////////////////////////////
  onLocationChangeHandler(url, referrer) {
    // we will filter some urls here, we need to add them in the future we will
    // https://cliqztix.atlassian.net/browse/EX-4570
    // resource://
    // about:
    // file://

    if (!url ||
        !(url.startsWith('http://') || url.startsWith('https://')) ||
        this.notAllowedUrls.test(url)) {
      return;
    }

    // now we add the referrer to the url
    let referrerName = null;
    if (referrer) {
      const referrerUrlDetails = utils.getDetailsFromUrl(referrer);
      referrerName = referrerUrlDetails.name;
    }

    const urlData = new UrlData(url, referrerName);

    try {
      this._publish(this.urlChangeCbs, urlData);
    } catch (e) {
      // log this error, is nasty, something went wrong
      logger.error('Exception catched when processing a new event: ', e);
    }
  }

  // ///////////////////////////////////////////////////////////////////////////
  beforeRequestListener(requestObj) {
    const url = requestObj.url;

    // do first filtering
    if (!url) {
      return;
    }

    // check if we have a domain for this
    const urlData = new UrlData(requestObj.url);
    const domainName = urlData.getDomain();
    // check if we have the associated domain
    if (!this.httpReqCbs.has(domainName)) {
      return;
    }
    // we have callbacks then we call them
    this._publish(this.httpReqCbs.get(domainName), { reqObj: requestObj, url_data: urlData });
  }

  //
  // @brief generic publish method
  // @param args
  //
  _publish(callbacksMap, args) {
    callbacksMap.forEach((cargs, cb) => {
      utils.setTimeout(() => {
        try {
          cb(args, cargs);
        } catch (e) {
          logger.error('Error on publishing an event:', e);
        }
      }, 0);
    });
  }
}
