import HeaderInfoVisitor from 'platform/antitracking/header-info-visitor';
import * as browser from 'platform/browser';
import { utils } from 'core/cliqz';
import { getTabsForURL } from 'platform/antitracking/tab-listener';

// An abstraction layer for extracting contextual information
// from the HttpChannel on various Firefox versions.
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
var nsIHttpChannel = Ci.nsIHttpChannel;

// Class to manage the window tree and resolve origin tab and url for pages
class WindowTree {

  constructor() {
    this._wins = new Map();
  }

  addRootWindow(id, url) {
    this._removeWindowTree(id);
    this._wins.set(id, {url,
      top: true,
      id
    });
  }

  addLeafWindow(id, parentId, url) {
    let parent = this.getWindowByID(parentId);
    if (id === parentId && parent) {
      // not actually a leaf, do no overwrite parent
      // instead annotate parent
      if(!parent.frames) {
        parent.frames = [];
      }
      parent.frames.push(url);
      return;
    }
    this._removeWindowTree(id);
    var win = {
      url,
      id,
      parent: parentId,
      top: false
    };
    if (!parent) {
      win.orphan = true;
    }
    this._wins.set(id, win);
  }

  addWindowAction(id, parentId, url, contentType) {
    if (!this.getWindowByID(id) && this.getWindowByID(parentId)) {
      this._wins.set(id, {url,
        top: false,
        id,
        origin: contentType,
        parent: parentId
      });
    }
  }

  getWindowByID(id) {
    return this._wins.get(id);
  }

  getRootWindow(id) {
    let win = this.getWindowByID(id);
    while (win && !win.top && win.id !== win.parent) {
      let parentWin = this.getWindowByID(win.parent);
      if (!parentWin) {
        break;
      }
      win = parentWin;
    }
    return win;
  }

  _removeWindowTree(id) {
    if (this._wins.has(id)) {
      this._wins.delete(id);
      for (let win of this._wins.values()) {
        if (win.parent === id) {
          this._removeWindowTree(win.id);
        }
      }
    }
  }

  getTree(rootId) {
    var {url} = this.getWindowByID(rootId);
    var rootNode = {
      id: rootId,
      url
    };
    rootNode.children = [...this._wins.values()].filter((w) => {
      return w.parent === rootId
    }).map((w) => {
      return this.getTree(w.id);
    });
    return rootNode;
  }

  cleanWindows() {
    for (let w of this._wins.values()) {
      if ((w.top && !browser.isWindowActive(w.id)) || !w.top && !(w.parent in this._wins)) {
        this._removeWindowTree(w.id);
      }
    }
  }
}

var windowTree = new WindowTree();

function HttpRequestContext(subject) {
  this.subject = subject;
  this.channel = subject.QueryInterface(nsIHttpChannel);
  this.loadInfo = this.channel.loadInfo;
  this.url = ''+ this.channel.URI.spec;
  this.method = this.channel.requestMethod;
  this._parsedURL = undefined;
  this._legacy_source = undefined;
  this.source = this.getSourceURL();

  this.oriWin = this.getOriginWindowID();
  this.cpt = this.getContentPolicyType();
  let tabId = this.getOuterWindowID(),
      parentId = this.getParentWindowID();

  // tab tracking
  if(this.isFullPage()) {
    // fullpage - add tracked tab
    windowTree.addRootWindow(tabId, this.url);
  } else if (this.getContentPolicyType() === 7) {
    // frame, add tab with parent
    windowTree.addLeafWindow(tabId, parentId, this.url);
  } else if (!windowTree.getWindowByID(tabId)) {
    // plain request for a frameID we haven't seen yet
    // check it is valid (i.e. loading context is somewhere in the tree)
    // this is required to track the source tabId for request which come with a new frameID, but we can determine
    // the correct loadingDocument.
    const rootWindow = windowTree.getRootWindow(parentId);
    const parentWindow = windowTree.getWindowByID(parentId);
    const loadingDocument = this.getLoadingDocument();
    if ((parentWindow && (parentWindow.url === loadingDocument)) || (rootWindow && (rootWindow.url === loadingDocument))) {
      windowTree.addWindowAction(tabId, parentId, this.url, this.getContentPolicyType());
    }
  }
}

HttpRequestContext._wt = windowTree
// clean up tab cache every minute
HttpRequestContext._cleaner = null;

HttpRequestContext.initCleaner = function() {
  if (!HttpRequestContext._cleaner) {
    HttpRequestContext._cleaner = utils.setInterval(function() {
      windowTree.cleanWindows();
    }, 60000);
  }
};

HttpRequestContext.unloadCleaner = function() {
  utils.clearInterval(HttpRequestContext._cleaner);
  HttpRequestContext._cleaner = null;
};

HttpRequestContext.prototype = {
  getInnerWindowID: function() {
    return this.loadInfo ? this.loadInfo.innerWindowID : 0;
  },
  getOuterWindowID: function() {
    if (this.loadInfo && (this.loadInfo.frameOuterWindowID || this.loadInfo.outerWindowID)) {
      // use frameOuterWindowID over outerWindowID as per: https://dxr.mozilla.org/mozilla-beta/source/toolkit/modules/addons/WebRequest.jsm#543
      return this.loadInfo.frameOuterWindowID ? this.loadInfo.frameOuterWindowID : this.loadInfo.outerWindowID;
    } else {
      return this._legacyGetWindowId();
    }
  },
  getParentWindowID: function() {
    if (this.loadInfo && (this.loadInfo.frameOuterWindowID || this.loadInfo.outerWindowID)) {
      return this.loadInfo.frameOuterWindowID ? this.loadInfo.outerWindowID : this.loadInfo.parentOuterWindowID
    } else {
      return this.getOuterWindowID();
    }
  },
  getLoadingDocument: function() {
    if (this.isFullPage()) {
      return this.url;
    } else if (this.loadInfo !== null) {
      if (this.loadInfo.loadingPrincipal && this.loadInfo.loadingPrincipal.URI) {
        return this.loadInfo.loadingPrincipal.URI.spec;
      } else if (this.loadInfo.loadingDocument != null && this.loadInfo.loadingDocument.location && this.loadInfo.loadingDocument.location.href) {
        return this.loadInfo.loadingDocument.location.href;
      } else {
        return "";
      }
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
      if (!refstr) {
        return;
      }
      referrer = decodeURIComponent(refstr);
      return referrer;
    } catch(ee) {
      return refstr
    }
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
    let rootWindow = windowTree.getRootWindow(this.getParentWindowID());
    if (rootWindow) {
      return rootWindow.id;
    } else {
      return this.getOuterWindowID();
    }
  },
  isChannelPrivate: function() {
    return this.channel.QueryInterface(Ci.nsIPrivateBrowsingChannel).isChannelPrivate;
  },
  getPostData() {
    let visitor = new HeaderInfoVisitor(this.channel);
    let requestHeaders = visitor.visitRequest();
    return visitor.getPostData();
  },
  getSourceURL: function() {
    // determine the source page url for this request.
    const rootWindow = windowTree.getRootWindow(this.getOuterWindowID());
    const loadingDocument = this.getLoadingDocument() || this.getReferrer() || "";

    if (rootWindow && rootWindow.url !== loadingDocument) {
      // Request was not loaded from the root document either:
      // 1) window id is different, so it was loaded from an iframe -> source is the root
      // 2) window id is the same, so there is a mismatch -> fallback on the loading document as the source
      // On older firefox we don't see iframe window ids, so we look for the loading doc in the list of frames for this root.
      if (this.getOuterWindowID() !== rootWindow.id || (rootWindow.frames && rootWindow.frames.indexOf(loadingDocument) !== -1)) {
        return rootWindow.url;
      } else {
        return loadingDocument;
      }
    } else {
      return loadingDocument;
    }
  },
  getTriggeringPrincipal: function() {
    if (this.loadInfo && this.loadInfo.triggeringPrincipal) {
      return this.loadInfo.triggeringPrincipal.origin;
    }
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
  },
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
    var source_tabs = getTabsForURL(source_url);
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

      let loadContext = aRequest.loadGroup.notificationCallbacks
                      .getInterface(Components.interfaces.nsILoadContext);
      return loadContext;
    } catch (ex) {
      return null;
    }
  }
}

export { HttpRequestContext, getRefToSource, WindowTree };
