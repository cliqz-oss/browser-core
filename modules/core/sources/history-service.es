let hs;

try {
  hs = Cc["@mozilla.org/browser/nav-history-service;1"]
         .getService(Ci.nsINavHistoryService);
} catch(e) {
  hs = {
    addObserver() {},
    removeObserver() {}
  };
}

export default hs;
