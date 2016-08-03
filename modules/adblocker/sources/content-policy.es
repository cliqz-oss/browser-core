import { utils } from 'core/cliqz';
import tp_events from 'antitracking/tp_events';
import { URLInfo } from 'antitracking/url';
import { sameGeneralDomain } from 'antitracking/domain';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

var ContentPolicy = {
  classDescription: "CliqzContentPolicy",
  classID: Components.ID("{87654321-1234-1234-1234-123456789cba}"),
  contractID: "@cliqz.com/test-policy;1",
  xpcom_categories: "content-policy",
  requests2dom: {},

  init: function() {
    let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
    registrar.registerFactory(this.classID, this.classDescription, this.contractID, this);
    let catMan = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
    catMan.addCategoryEntry(this.xpcom_categories, this.contractID, this.contractID, false, true);
  },

  shouldLoad: function(contentType, contentLocation, requestOrigin, node, mimeTypeGuess, extra) {
    var url = contentLocation ? contentLocation.spec : "null",
        ref = null,
        urlParts = URLInfo.get(url);

    // utils.getWindow().console.log(node.ownerDocument.defaultView.top.document.URL, url);
    try{
          ref = node.ownerDocument.defaultView.top.document.URL;
        } catch(e) {
          ref = requestOrigin ? requestOrigin.spec : "null";
        }

    let refParts = URLInfo.get(ref);

    // utils.getWindow().console.log(node.ownerDocument.defaultView.top.document.URL, 'doc');
    if (!sameGeneralDomain(urlParts.hostname, refParts.hostname)) {
      if (!(ref in this.requests2dom)) {
        this.requests2dom[ref] = {};
      }
      this.requests2dom[ref][url] = node;
    }
    return Ci.nsIContentPolicy.ACCEPT;
  },

  shouldProcess: function(contentType, contentLocation, requestOrigin, node, mimeTypeGuess, extra) {
    // utils.getWindow().console.log(node.ownerDocument.defaultView.top.document.URL, 'doc');
    // TODO: use tab id instead of ref, if two tabs share same url, we will end up with wrong nodes
    var url = contentLocation ? contentLocation.spec : "null",
        ref = null,
        urlParts = URLInfo.get(url);
    try{
      ref = node.ownerDocument.defaultView.top.document.URL;e
    } catch(e) {
      ref = requestOrigin ? requestOrigin.spec : "null";
    }
    let  refParts = URLInfo.get(ref);
    if (!sameGeneralDomain(urlParts.hostname, refParts.hostname)) {
      if (!(ref in this.requests2dom)) {
        this.requests2dom[ref] = {};
      }
      this.requests2dom[ref][url] = node;
    }
    return Ci.nsIContentPolicy.ACCEPT;
  },

  // nsIFactory interface implementation
  createInstance: function(outer, iid) {
    if (outer) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return this.QueryInterface(iid);
  },

  // nsISupports interface implementation
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPolicy, Ci.nsIFactory]),

  cleanUP: function() {
    // clean up dead objects (i.e. closed tabs)
    for (let ref in this.requests2dom) {
      for (let url in this.requests2dom[ref]) {
        if (this.requests2dom[ref][url] === undefined) {  // it's an dead object
          delete this.requests2dom[ref][url];
        }
      }
      if (Object.keys(this.requests2dom[ref]).length == 0) {
        delete this.requests2dom[ref];
      }
    }
  }
};

export default ContentPolicy;
