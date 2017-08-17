'use strict';

var osAPI = {
  OS: {},
  init: function() {
    if(window.webkit) {
      osAPI.OS.postMessage = window.webkit.messageHandlers.jsBridge.postMessage.bind(window.webkit.messageHandlers.jsBridge);
    } else if(window.jsBridge) {
        var nativePostMessage = jsBridge.postMessage.bind(jsBridge);
        osAPI.OS.postMessage = function(message) {
          nativePostMessage(JSON.stringify(message));
        }
    } else {
      osAPI.OS.postMessage = MockOS.postMessage;
    }
    osAPI.isReady();
  },
  /**
    function: searchHistory
    description: requests search history from OS
    params: query as string
    message data: query as string
    message callback data: {results: [{url: as string, title: as string}], query: as string}
  */
  searchHistory: function(query, callback) {
    var message = {
      action: "searchHistory",
      data: query,
      callback: callback
    }
    osAPI.OS.postMessage(message);
  },
  /**
    function: getHistoryItems
    description: requests user history from OS
    message callback data: [{url, title, id, timestamp}]
  */
  getHistoryItems: function(callback, start, count) {
    var message = {
      action: "getHistoryItems",
      callback: callback
    };
    message.data = {
      offset: start,
      limit: count
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: getFavorites
    description: requests user favorites from OS
    message callback data: [{url, title, timestamp}]
  */
  getFavorites: function(callback) {
    var message = {
      action: "getFavorites",
      callback: callback
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: freshtabReady
    description: informs OS that freshtab is loaded
  */
  freshtabReady: function() {
    var message = {
      action: "freshtabReady"
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: isReady
    description: informs OS that everything is loaded
  */
  isReady: function() {
    var message = {
      action: "isReady"
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: openLink
    description: requests the OS to open the url
    params: url as string
    message data: url as string
  */
  openLink: function(url) {
    var message = {
      action: "openLink",
      data: url
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: browserAction
    description: requests the OS to perform a custom action (call number, send e-mail, or etc..)
    params: type as string (the type of the data)
    params: data as string (phone number, e-mail, etc..)
    message data: {data: as string, type: as string}
  */
  browserAction: function(type, data) {
    var message = {
      action: "browserAction",
      data: {
        data: data,
        type: type
      }
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: getTopSites
    description: requests the top sites from the OS
    params: callback as string (name of the callback)
    params: limit as integer (max number of results)
    message data: limit as integer
  */
  getTopSites: function(callback, limit) {
    var message = {
      action: "getTopSites",
      data: limit,
      callback: callback
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: autocomplete
    description: requests the OS to autocomplete a query
    params: query as string
    message data: query as string
  */
  autocomplete: function(query) {
    var message = {
      action: "autocomplete",
      data: query
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: notifyQuery
    description: requests the OS to change the url to a query
    params: query as string
    message data: query as string
  */
  notifyQuery: function(query, locationEnabled, lat, lon) {
    var message = {
      action: "notifyQuery",
      data: {
        "q": query,
      }
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: pushTelemetry
    description: pushes telemetry to the OS
    params: msg as object
    message data: msg as object
  */
  pushTelemetry: function(msg) {
    var message = {
      action: "pushTelemetry",
      data: msg
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: copyResult
    description: sends a result for the OS to be copied to clipboard
    params: value as string
    message data: val as string
  */
  copyResult: function(val) {
    var message = {
      action: "copyResult",
      data: val
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: removeHistoryItems
    description: removes history records from native history
    params: ids as list
    message data: ids as list
  */
  removeHistoryItems: function(ids) {
    var message = {
      action: "removeHistoryItems",
      data: ids
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: setFavorites
    description: sets history records' favorite property
    params: favorites as list
    params: value as boolean
    message data: favorites as list, value as boolean
  */
  setFavorites: function(favorites, value) {
    var message = {
      action: "setFavorites",
      data: {
        favorites: favorites,
        value: value
      }
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: shareCard
    description: sends card url to the OS
    params: cardUrl as string
    message data: cardUrl as string
  */
  shareCard: function(cardUrl) {
    var message = {
      action: "shareCard",
      data: cardUrl
    };
    osAPI.OS.postMessage(message);
    CliqzUtils.telemetry({
      type: 'cards',
      action: 'click',
      target: 'share'
    });
  },
  /**
    function: shareLocation
    description: requests sharing of user location
  */
  shareLocation: function() {
    Search && Search.clearResultCache();
    var message = {
      action: "shareLocation"
    };
    osAPI.OS.postMessage(message);
  },
  /**
    function: pushJavascriptResult
    description: sends result to native
    @param: {int} handler - hashcode of callback function
    @param: {Object} result - result
  */
  pushJavascriptResult: function(handler, result) {
    var message = {
      action: "pushJavascriptResult",
      data: {
        ref: handler,
        data: result
      }
    };
    osAPI.OS.postMessage(message);
  },

  /**
    function: notifyYoutubeVideoUrls
    description: sends the video urls fetched via ytdownloader
    params: an array of objects
    message data: an array of objects
  */
  notifyYoutubeVideoUrls: function(urls) {
    var message = {
      action: "notifyYoutubeVideoUrls",
      data: urls
    };
    osAPI.OS.postMessage(message);
  },

  /**
    function: showQuerySuggestions
    description: sends the query suggestions to native
    @param: {string} query - query
    @param: {array} suggestions - suggestions
  */
  showQuerySuggestions: function(query, suggestions) {
    var message = {
      action: "showQuerySuggestions",
      data: {
        query: query,
        suggestions: suggestions
      }
    };
    osAPI.OS.postMessage(message);
  },
  // DT-mobile pairing messages (uses a different bridge, need to refactor this)
  downloadVideo: function(url) {
    var message = {
      action: 'downloadVideo',
      data: url,
    };
    osAPI.OS.postMessage(message);
  },

  openTab: function(url) {
    var message = {
      action: 'openTab',
      data: url,
    };
    osAPI.OS.postMessage(message);
  },

  pushPairingData: function(data) {
    var message = {
      action: 'pushPairingData',
      data: data,
    };
    osAPI.OS.postMessage(message);
  },

  deviceARN: function(callback) {
    var message = {
      action: 'deviceARN',
      data: '',
      callback: callback,
    };
    osAPI.OS.postMessage(message);
  },
  notifyPairingError: function(data) {
    var message = {
      action: 'notifyPairingError',
      data: data,
    };
    osAPI.OS.postMessage(message);
  },
  notifyPairingSuccess: function(data) {
    var message = {
      action: 'notifyPairingSuccess',
      data: data,
    };
    osAPI.OS.postMessage(message);
  },
};
