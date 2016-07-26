// TODO dependency on CliqzAttrack.tab_listener
import CliqzAttrack from 'antitracking/attrack';
import HeaderInfoVisitor from 'platform/antitracking/header-info-visitor';
import * as browser from 'platform/browser';

// An abstraction layer for extracting contextual information
// from the HttpChannel on various Firefox versions.
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
var nsIHttpChannel = Ci.nsIHttpChannel;

function HttpRequestContext(subject) {
  this.subject = subject;
  this.channel = subject.QueryInterface(nsIHttpChannel);
  this.loadInfo = this.channel.loadInfo;
  this.url = ''+ this.channel.URI.spec;
  this.method = this.channel.requestMethod;
  this._parsedURL = undefined;
  this._legacy_source = undefined;

  let tabId = this.getOuterWindowID();
  let parentId = this.getParentWindowID();
  // tab tracking
  if(this.isFullPage()) {
    // fullpage - add tracked tab
    HttpRequestContext.deleteTab(tabId); // clear old tab and children
    HttpRequestContext._tabs[tabId] = {url: this.url, top: true, id: tabId};
  } else if ( this.getContentPolicyType() === 7 ) {
    // frame, add tab with parent
    // need this check to guarantee tree search will terminate
    if (tabId != parentId) {
      HttpRequestContext._tabs[tabId] = {url: this.url, top: false, parent: parentId, id: tabId};
    }
  } else if (!(tabId in HttpRequestContext._tabs) && parentId in HttpRequestContext._tabs) {
    // new tab id, but not a frame request
    HttpRequestContext._tabs[tabId] = {url: this.url, top: false, parent: parentId, id: tabId, origin: this.getContentPolicyType()};
  }
}

HttpRequestContext._tabs = {};
// clean up tab cache every minute
HttpRequestContext._cleaner = null;

HttpRequestContext.initCleaner = function() {
  if (!HttpRequestContext._cleaner) {
    HttpRequestContext._cleaner = CliqzUtils.setInterval(function() {
      for (let t in HttpRequestContext._tabs) {
        if(HttpRequestContext._tabs[t].top && !browser.isWindowActive(t)) {
          HttpRequestContext.deleteTab(t);
        }
      }
    }, 60000);
  }
};

HttpRequestContext.unloadCleaner = function() {
  CliqzUtils.clearInterval(HttpRequestContext._cleaner);
  HttpRequestContext._cleaner = null;
};

HttpRequestContext.deleteTab = function(tabId) {
  var childTabs = [];
  for (let id in HttpRequestContext._tabs) {
    let tab = HttpRequestContext._tabs[id];
    if (tab.parent == tabId) {
      childTabs.push(id);
    }
  }
  delete HttpRequestContext._tabs[tabId];
  childTabs.forEach( (t) => {
    HttpRequestContext.deleteTab(t);
  });
};

HttpRequestContext.prototype = {

  getInnerWindowID: function() {
    return this.loadInfo ? this.loadInfo.innerWindowID : 0;
  },
  getOuterWindowID: function() {
    if (this.loadInfo == null || this.loadInfo.outerWindowID === undefined) {
      return this._legacyGetWindowId();
    } else {
      return this.loadInfo.outerWindowID;
    }
  },
  getParentWindowID: function() {
    if (this.loadInfo == null || this.loadInfo.parentOuterWindowID === undefined) {
      return this.getOuterWindowID();
    } else {
      return this.loadInfo.parentOuterWindowID;
    }
  },
  getLoadingDocument: function() {
    let parentWindow = this.getParentWindowID();
    if (parentWindow in HttpRequestContext._tabs) {
      while (HttpRequestContext._tabs[parentWindow] && !HttpRequestContext._tabs[parentWindow].top) {
        parentWindow = HttpRequestContext._tabs[parentWindow].parent;
      }
      return HttpRequestContext._tabs[parentWindow].url;
    } else if (this.loadInfo != null) {
      return this.loadInfo.loadingDocument != null && 'location' in this.loadInfo.loadingDocument && this.loadInfo.loadingDocument.location ? this.loadInfo.loadingDocument.location.href : ""
    } else {
      return this._legacyGetSource().url;
    }
  },
  getContentPolicyType: function() {
    if (this.loadInfo) {
      if (this.loadInfo.contentPolicyType) {
        return this.loadInfo.contentPolicyType;
      } else {
        return this.loadInfo.externalContentPolicyType;
      }
    } else {
      return this._legacyGetContentPolicyType();
    }
  },
  isFullPage: function() {
    return this.getContentPolicyType() == 6;
  },
  getCookieData: function() {
    return this.getRequestHeader("Cookie");
  },
  getReferrer: function() {
    var refstr = null,
        referrer = '';
    try {
      refstr = this.getRequestHeader("Referer");
      referrer = dURIC(refstr);
    } catch(ee) {}
    return referrer;
  },
  getRequestHeader: function(header) {
    let header_value = null;
    try {
      header_value = this.channel.getRequestHeader(header);
    } catch(ee) {}
    return header_value;
  },
  getResponseHeader: function(header) {
    let header_value = null;
    try {
      header_value = this.channel.getResponseHeader(header);
    } catch(ee) {}
    return header_value;
  },
  getOriginWindowID: function() {
    // in most cases this is the same as the outerWindowID.
    // however for frames, it is the parentWindowId
    let parentWindow = this.getParentWindowID();
    if (!this.isFullPage() && (parentWindow in HttpRequestContext._tabs || this.getContentPolicyType() == 7)) {
      while (HttpRequestContext._tabs[parentWindow] && !HttpRequestContext._tabs[parentWindow].top) {
        parentWindow = HttpRequestContext._tabs[parentWindow].parent;
      }
      return parentWindow;
    } else {
      return this.getOuterWindowID();
    }
  },
  isChannelPrivate() {
    return this.channel.QueryInterface(Ci.nsIPrivateBrowsingChannel).isChannelPrivate;
  },
  getPostData() {
    let visitor = new HeaderInfoVisitor(this.channel);
    let requestHeaders = visitor.visitRequest();
    return visitor.getPostData();
  },
  _legacyGetSource: function() {
    if (this._legacy_source === undefined) {
      this._legacy_source = getRefToSource(this.subject, this.getReferrer());
    }
    return this._legacy_source;
  },
  _legacyGetWindowId: function() {
    // Firefox <=38 fallback for tab ID.
    let source = this._legacyGetSource();
    return source.tab;
  },
  _legacyGetContentPolicyType: function() {
    // try to get policy get page load type
    let load_type = getPageLoadType(this.channel);

    if (load_type == "fullpage") {
      return 6;
    } else if (load_type == "frame") {
      return 7;
    }

    // XHR is easy
    if (isXHRRequest(this.channel)) {
      return 11;
    }

    // other types
    return 1;
  }
}

function isXHRRequest(channel) {
  // detect if the request on a given channel was an XHR request.
  // Source: http://stackoverflow.com/questions/22659863/identify-xhr-ajax-response-while-listening-to-http-response-in-firefox-addon
  // Returns: True iff this request was an XHR request, false otherwise
  var isXHR;
  try {
    var callbacks = channel.notificationCallbacks;
    var xhr = callbacks ? callbacks.getInterface(Ci.nsIXMLHttpRequest) : null;
    isXHR = !!xhr;
  } catch (e) {
    isXHR = false;
  }
  return isXHR;
}

function getPageLoadType(channel) {
  /* return type of page load from channel load flags.
      returns "fullpage" for initial document loads,
          "frame" for framed elements,
          or null otherwise.
   */
  if (channel.loadFlags & Ci.nsIHttpChannel.LOAD_INITIAL_DOCUMENT_URI) {
    return "fullpage";
  } else if (channel.loadFlags & Ci.nsIHttpChannel.LOAD_DOCUMENT_URI) {
    return "frame";
  } else {
    return null;
  }
}

function getRefToSource(subject, refstr){
  // Source url is the origin of request, which helps to differentiate between first-party and third-party calls.

  var source = {};
  source.url = '';
  source.tab = -1;
  source.lc = null;
  var source_url = '';
  var source_tab = -1;

  try {
    var lc = getLoadContext(subject);
    if(lc != null) {
     source_url =''+lc.topWindow.document.documentURI;
     var util = lc.topWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
     source_tab = util.outerWindowID;
    }
  } catch(ex) {
  }

  if(!source_url && refstr != '') source_url = refstr;

  if(source_tab == -1) {
    var source_tabs = CliqzAttrack.tab_listener.getTabsForURL(source_url);
    if(source_tabs.length > 0) {
      source_tab = source_tabs[0];
    }
  }
  source.url = source_url;
  source.tab = source_tab;
  source.lc = lc;

  return source;
}

function getLoadContext( aRequest ) {
  try {
    // first try the notification callbacks
    var loadContext = aRequest.QueryInterface( Components.interfaces.nsIChannel )
                    .notificationCallbacks
                    .getInterface( Components.interfaces.nsILoadContext );
    return loadContext;
  } catch (ex) {
    // fail over to trying the load group
    try {
      if( !aRequest.loadGroup ) return null;

      var loadContext = aRequest.loadGroup.notificationCallbacks
                      .getInterface(Components.interfaces.nsILoadContext);
      return loadContext;
    } catch (ex) {
      return null;
    }
  }
}

export { HttpRequestContext, getRefToSource };
