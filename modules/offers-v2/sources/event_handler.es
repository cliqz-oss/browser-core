/*

This module will be used to handle different kind of events in a more efficient
way for the offers module.

*/

import LoggingHandler from 'offers-v2/logging_handler';
import { utils, events } from 'core/cliqz';
import WebRequest from 'core/webrequest';

////////////////////////////////////////////////////////////////////////////////
// Consts
//
const MODULE_NAME = 'event_handler';

////////////////////////////////////////////////////////////////////////////////
export class EventHandler {


  constructor() {
    // the list of callbacks we will handle.
    this.callbacksMap = {
      url_change: [],
      url_tab_change: [],
      url_tab_sel_change: [],
      query_search: [],
      http_req: {},

      http_req_all: [], // this should be removed on the future! we should use more specific ones
    };


    // TODO here we should subscribe to the system events
    // we want to handle the following events:
    // - url has changed
    // - new query has being performed
    // - new http / post request has being done in a particular domain
    //
    this.onTabOrWinChangedHandler = this.onTabOrWinChangedHandler.bind(this);
    this.onTabLocChanged = this.onTabLocChanged.bind(this);
    this.onTabSelectionChangedHandler = this.onTabSelectionChangedHandler.bind(this);

    events.sub('core.location_change', this.onTabOrWinChangedHandler);
    events.sub('content:location-change', this.onTabLocChanged);
    events.sub('core:tab_select', this.onTabSelectionChangedHandler);

    this.beforeRequestListener = this.beforeRequestListener.bind(this)
    WebRequest.onBeforeRequest.addListener(this.beforeRequestListener);
  }

  //
  // @brief destructor
  //
  destroy() {
    events.un_sub('core.location_change', this.onTabOrWinChangedHandler);
    events.un_sub('content:location-change', this.onTabLocChanged);
    events.un_sub('core:tab_select', this.onTabSelectionChangedHandler);

    WebRequest.onBeforeRequest.removeListener(this.beforeRequestListener);
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
  subscribeUrlChange(cb) {
    this.callbacksMap['url_change'].push(cb);
  }
  unsubscribeUrlChange(cb) {
    this._unsubscribeCallback('url_change', cb);
  }

  //
  // @brief subscribe to get events whenever a tab loc changed
  // @note
  //  The event emitted is a url details structure + referrer field (check
  //  utils.getDetailsFromUrl(url); for more info)
  //    {
  //      'url' : urlObj,
  //      'referrer' : the_referrer
  //    }

  //
  subscribeTabUrlChange(cb) {
    this.callbacksMap['url_tab_change'].push(cb);
  }
  unsubscribeTabUrlChange(cb) {
    this._unsubscribeCallback('url_tab_change', cb);
  }

  //
  // @brief when a tab selection changes
  //
  subscribeTabSelChange(cb) {
    this.callbacksMap['url_tab_sel_change'].push(cb);
  }
  unsubscribeTabSelChange(cb) {
    this._unsubscribeCallback('url_tab_sel_change', cb);
  }

  //
  // @brief subscribe to get events when new queries are being performed.
  // @note
  //    The event emitted will be:
  //  {
  //    'real_query' : q,
  //    'engine' : X,     // this is the code specifying where the query was performed
  //                      // for example (cliqz bar, google, etc).
  //
  //  }
  //
  subscribeQuerySearch(cb) {
    this.callbacksMap['query_search'].push(cb);
  }
  unsubscribeQuerySearch(cb) {
    this._unsubscribeCallback('query_search', cb);
  }

  //
  // @brief subscribe to get events for http requests (POST / GET) for particular
  //        domains
  // @param cb  The callback to receive the event
  // @param domainName The domain name that we want to get the callback.
  // @note The event structure will look like:
  //  {
  //    'req_obj' : x, // the request object containing the full info of it
  //  }
  //
  //
  subscribeHttpReq(cb, domainName) {
    if (!this.callbacksMap['http_req'][domainName]) {
      this.callbacksMap['http_req'][domainName] = []
    }
    this.callbacksMap['http_req'][domainName].push(cb);
  }
  unsubscribeHttpReq(cb, domainName) {
    if (!this.callbacksMap['http_req'][domainName]) {
      // nothing to do
      return;
    }
    // now remove it
    const index = this.callbacksMap['http_req'][domainName].indexOf(cb);
    if (index > -1) {
      this.callbacksMap['http_req'][domainName].splice(index, 1);
    }
  }

  //
  // @brief temporary (for backward compatibility) function that should be
  //        removed on the future so we use the one specifying  the domain.
  //
  subscribeAllHttpReq(cb) {
    this.callbacksMap['http_req_all'].push(cb);
  }
  unsubscribeAllHttpReq(cb) {
    this._unsubscribeCallback('http_req_all', cb);
  }

  //////////////////////////////////////////////////////////////////////////////
  //                          PRIVATE METHODS
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  onTabLocChanged(data) {
    // EX-2561: private mode then we don't do anything here
    if (data.isPrivate) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'window is private skipping: onTabLocChanged');
      return;
    }

    // We need to subscribe here to get events everytime the location is
    // changing and is the a new url. We had issues since everytime we switch
    // the tabs we got the event from core.locaiton_change and this is not correct
    // for our project.
    // Check issue https://cliqztix.atlassian.net/projects/GR/issues/GR-117
    //
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, ' location changed from ' + JSON.stringify(data));

    // skip the event if is the same document here
    // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener
    //
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'new event with location: ' + data.url + ' - referrer: ' + data.referrer);
    if (data.flags === Components.interfaces.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'discarding event since it is repeated');
      return;
    }
    // else we emit the event here
    this.onLocationChangeHandler(data.url, data.referrer);
  }

  //////////////////////////////////////////////////////////////////////////////
  onLocationChangeHandler(url, referrer) {
    var u = utils.getDetailsFromUrl(url);
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'location changed to ' + u.host);

    // now we add the referrer to the url
    if (referrer) {
      var referrerUrlDetails = utils.getDetailsFromUrl(referrer);
      u['referrer'] = referrerUrlDetails.name;
    } else {
      u['referrer'] = '';
    }

    try {
      this._publish(this.callbacksMap['url_change'], u, url);
    } catch (e) {
      // log this error, is nasty, something went wrong
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Exception catched when processing a new event: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
  }


  //////////////////////////////////////////////////////////////////////////////
  onTabOrWinChangedHandler(url, isWinPrivate) {
    // check if this is the window
    // EX-2561: private mode then we don't do anything here
    if (isWinPrivate) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'window is private skipping: onTabOrWinChangedHandler');
      return;
    }

    try {
      var u = utils.getDetailsFromUrl(url);
      this._publish(this.callbacksMap['url_tab_change'], { url: u });
    } catch (e) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Exception catched on onTabOrWinChangedHandler: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  onTabSelectionChangedHandler(data) {
    // data.url +
    try {
      this._publish(this.callbacksMap['url_tab_sel_change'], data);
    } catch (e) {
      // log this error, is nasty, something went wrong
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Exception catched when processing a new event: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
  }


  //////////////////////////////////////////////////////////////////////////////
  beforeRequestListener(requestObj) {
    // this is for temporary backward compatibility, we should remove this
    let cbAllHttpReq = this.callbacksMap['http_req_all'];
    if (cbAllHttpReq.length > 0) {
      this._publish(cbAllHttpReq, { req_obj: requestObj });
    }

    // check if we have a domain for this
    var urlInfo = utils.getDetailsFromUrl(requestObj.url);
    const domainName = urlInfo['name'];
    var callbacks = this.callbacksMap['http_req'][domainName];
    if (!callbacks) {
      return;
    }

    // we have callbacks then we call them
    this._publish(callbacks, { req_obj: requestObj });
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // @brief generic unsubscription of a callback
  //
  _unsubscribeCallback(typeName, cb) {
    if (!this.callbacksMap[typeName]) {
      return;
    }
    const index = this.callbacksMap[typeName].indexOf(cb);
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
    (callbacksList || []).forEach(function (ev) {
      utils.setTimeout(function () {
        try {
          ev.apply(null, args);
        } catch (e) {
          LoggingHandler.LOG_ENABLED &&
          LoggingHandler.error(MODULE_NAME,
                               'Error on publishing an event: ' + e.toString() +
                               ' -- ' + e.stack,
                               LoggingHandler.ERR_INTERNAL);
        }
      }, 0);
    });
  }

}
