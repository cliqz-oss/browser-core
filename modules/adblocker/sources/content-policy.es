import { URLInfo } from 'antitracking/url';
import { sameGeneralDomain } from 'antitracking/domain';


const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

const ContentPolicy = {
  classDescription: 'CliqzContentPolicy',
  classID: Components.ID('{87654321-1234-1234-1234-123456789cba}'),
  contractID: '@cliqz.com/test-policy;1',
  xpcom_categories: 'content-policy',
  requests2dom: {},

  init() {
    this.registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
    this.registrar.registerFactory(this.classID, this.classDescription, this.contractID, this);
    this.catMan = Cc['@mozilla.org/categorymanager;1'].getService(Ci.nsICategoryManager);
    this.catMan.addCategoryEntry(this.xpcom_categories, this.contractID, this.contractID, false, true);
  },

  unload() {
    this.registrar.unregisterFactory(this.classID, this);
    this.catMan.deleteCategoryEntry(this.xpcom_categories, this.contractID, false);
  },

  shouldLoad(contentType, contentLocation, requestOrigin, node) {
    const url = contentLocation ? contentLocation.spec : 'null';
    const urlParts = URLInfo.get(url);
    let ref = null;

    // utils.getWindow().console.log(node.ownerDocument.defaultView.top.document.URL, url);
    try {
      ref = node.ownerDocument.defaultView.top.document.URL;
    } catch (e) {
      ref = requestOrigin ? requestOrigin.spec : 'null';
    }

    const refParts = URLInfo.get(ref);

    // utils.getWindow().console.log(node.ownerDocument.defaultView.top.document.URL, 'doc');
    if (!sameGeneralDomain(urlParts.hostname, refParts.hostname)) {
      if (!(ref in this.requests2dom)) {
        this.requests2dom[ref] = {};
      }
      this.requests2dom[ref][url] = node;
    }
    return Ci.nsIContentPolicy.ACCEPT;
  },

  shouldProcess(contentType, contentLocation, requestOrigin, node) {
    // utils.getWindow().console.log(node.ownerDocument.defaultView.top.document.URL, 'doc');
    // TODO: use tab id instead of ref, if two tabs share same url, we will end up with wrong nodes
    const url = contentLocation ? contentLocation.spec : 'null';
    const urlParts = URLInfo.get(url);
    let ref = null;
    try {
      ref = node.ownerDocument.defaultView.top.document.URL;
    } catch (e) {
      ref = requestOrigin ? requestOrigin.spec : 'null';
    }
    const refParts = URLInfo.get(ref);
    if (!sameGeneralDomain(urlParts.hostname, refParts.hostname)) {
      if (!(ref in this.requests2dom)) {
        this.requests2dom[ref] = {};
      }
      this.requests2dom[ref][url] = node;
    }
    return Ci.nsIContentPolicy.ACCEPT;
  },

  // nsIFactory interface implementation
  createInstance(outer, iid) {
    if (outer) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return this.QueryInterface(iid);
  },

  // nsISupports interface implementation
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPolicy, Ci.nsIFactory]),

  cleanUP() {
    // clean up dead objects (i.e. closed tabs)
    Object.keys(this.requests2dom).forEach(ref => {
      Object.keys(this.requests2dom[ref]).forEach(url => {
        if (this.requests2dom[ref][url] === undefined) {  // it's an dead object
          delete this.requests2dom[ref][url];
        }
      });

      if (Object.keys(this.requests2dom[ref]).length === 0) {
        delete this.requests2dom[ref];
      }
    });
  },
};

export default ContentPolicy;
