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
    this.callbacksMap = {
      url_change: [],
      http_req: {}
    };

    this.onTabLocChanged = this.onTabLocChanged.bind(this);

    events.sub('content:location-change', this.onTabLocChanged);

    this.beforeRequestListener = this.beforeRequestListener.bind(this)
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
      WebRequest.onBeforeRequest.removeListener(this.beforeRequestListener);
      this.requestListenerAdded = false;
    }
  }


  //////////////////////////////////////////////////////////////////////////////
  //                          PUBLIC METHODS
  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief subscribe to get events whenever a new url is performed
  // @note
  //  The event emitted is a url details structure + referrer field (check
  //  utils.getDetailsFromUrl(url); for more info)
  //
  subscribeUrlChange(cb, cargs = null) {
    this.callbacksMap['url_change'].push({ cb, cargs });
  }
  unsubscribeUrlChange(cb) {
    this._unsubscribeCallback('url_change', cb);
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
    if (!this.callbacksMap['http_req'][domainName]) {
      this.callbacksMap['http_req'][domainName] = [];
    }

    // add the listener if not added before
    if (!this.requestListenerAdded) {
      this.requestListenerAdded = true;
      WebRequest.onBeforeRequest.addListener(this.beforeRequestListener, {
        urls: ["http://*/*", "https://*/*"],
      });
    }

    var alreadySubscribed = false;
    this.callbacksMap['http_req'][domainName].forEach(function(elem) {
      if(elem.cb === cb) {
        alreadySubscribed = true;
      }
    });

    if(!alreadySubscribed) {
      this.callbacksMap['http_req'][domainName].push({ cb, cargs });
    }

    return !alreadySubscribed;
  }
  unsubscribeHttpReq(cb, domainName) {
    if (!this.callbacksMap['http_req'][domainName]) {
      // nothing to do
      return;
    }
    // now remove it
    let index = -1;
    for (let i = 0; i < this.callbacksMap['http_req'][domainName].length; i += 1) {
      if (this.callbacksMap['http_req'][domainName][i].cb === cb) {
        index = i;
        break;
      }
    }
    if (index > -1) {
      this.callbacksMap['http_req'][domainName].splice(index, 1);
    }
  }

  isHttpReqDomainSubscribed(cb, domainName) {
    if (!this.callbacksMap['http_req'][domainName]) {
      return false;
    }

    // add the listener if not added before
    if (!this.requestListenerAdded) {
      this.requestListenerAdded = true;
      WebRequest.onBeforeRequest.addListener(this.beforeRequestListener, {
        urls: ["*://*/*"],
      });
    }

    return this.callbacksMap['http_req'][domainName].some(e => e.cb === cb);
  }

  //////////////////////////////////////////////////////////////////////////////
  //                          PRIVATE METHODS
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
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

    this.lastUrl = data.url

    // else we emit the event here
    this.onLocationChangeHandler(data.url, data.referrer);
  }

  //////////////////////////////////////////////////////////////////////////////
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
      var referrerUrlDetails = utils.getDetailsFromUrl(referrer);
      referrerName = referrerUrlDetails.name;
    }

    const urlData = new UrlData(url, referrerName);

    try {
      this._publish(this.callbacksMap['url_change'], urlData);
    } catch (e) {
      // log this error, is nasty, something went wrong
      logger.error('Exception catched when processing a new event: ' + e);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
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
    if(domainName && this.callbacksMap['http_req']) {
      var callbacks = this.callbacksMap['http_req'][domainName];
      if (!callbacks) {
        return;
      }

      // we have callbacks then we call them
      this._publish(callbacks, { reqObj: requestObj, url_data: urlData });
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // @brief generic unsubscription of a callback
  //
  _unsubscribeCallback(typeName, cb) {
    if (!this.callbacksMap[typeName]) {
      return;
    }
    let index = -1;
    for (let i = 0; i < this.callbacksMap[typeName].length; i += 1) {
      if (this.callbacksMap[typeName][i].cb === cb) {
        index = i;
        break;
      }
    }
    if (index > -1) {
      this.callbacksMap[typeName].splice(index, 1);
    }
  }

  //
  // @brief generic publish method
  // @param args
  //
  _publish(callbacksList) {
    let args = Array.prototype.slice.call(arguments, 1);
    // we will use the last argument to provide the cargs
    args.push(null);
    (callbacksList || []).forEach(function (ev) {
      utils.setTimeout(function () {
        try {
          args[args.length - 1] = ev.cargs;
          ev.cb.apply(null, args);
        } catch (e) {
          logger.error('Error on publishing an event: ' + e.toString() +
                               ' -- ' + e.stack);
        }
      }, 0);
    });
  }
}
