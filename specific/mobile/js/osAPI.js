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
    function: isReady
    description: informs OS that everything is loaded
  */
  isReady: function() {
    var message = {
      action: "isReady"
    }
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
    }
    osAPI.OS.postMessage(message);
  },
  /**
    function: browserAction
    description: requests the OS to perform a custom action (call number, send e-mail, or etc..)
    params: data as string (phone number, e-mail, etc..)
    params: type as string (the type of the data)
    message data: {data: as string, type: as string}
  */
  browserAction: function(data, type) {
    var message = {
      action: "browserAction",
      data: {
        data: data,
        type: type
      }
    }
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
    }
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
    }
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
    }
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
    }
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
    }
    osAPI.OS.postMessage(message);
  },
  /**
    function: removeHistory
    description: removes history records from native history
    params: ids as list
    message data: ids as list
  */
  removeHistory: function(ids) {
    var message = {
      action: "removeHistory",
      data: ids
    }
    osAPI.OS.postMessage(message);
  },
  /**
    function: setHistoryFavorite
    description: sets history records' favorite property
    params: ids as list
    params: value as boolean
    message data: ids as list, value as boolean
  */
  setHistoryFavorite: function(ids, value) {
    var message = {
      action: "setHistoryFavorite",
      data: {
        ids: ids,
        value: value
      }
    }
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
    }
    osAPI.OS.postMessage(message);
  }
};
