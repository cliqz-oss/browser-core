import { utils } from 'core/cliqz';
import CliqzAttrack from 'antitracking/attrack';
import { checkFrame, countChildren, MAX_CHILDREN } from 'adblocker/cosmetics';
import { autoBlockAds } from 'adblocker/adblocker';


export function MutationLogger() {
  this.tabsInfo = {};  // first party url
  this.config = {
    childList: true,
    subtree: true
  };
}

MutationLogger.prototype = {
  onFrameMutation: function(mutations) {
    for (let m of mutations) {
      let t = m.target;
      if (t.querySelectorAll('video').length > 0) {  // find the frame element
        let frame = t.ownerDocument.defaultView.frameElement;
        CliqzUtils.f = frame;
        if (frame.getAttribute('cliqz-adb-blocked')) {
          while (frame.getAttribute('cliqz-adb-blocked') === 'parent') {
            frame.setAttribute('cliqz-adb-blocked', 'video-removed');
            frame = frame.parentNode;
          }
          frame.style.display = '';
          frame.setAttribute('cliqz-adb-blocked', 'video-removed');
          frame.setAttribute('cliqz-adblocker', 'safe');
        }
      }
    }
  },
  onMutation: function(mutations) {
    for (let m of mutations) {
      let t = m.target;
      try {
        if (t.getAttribute('cliqz-adb-blocked')) {
          let count = countChildren(t);
          if (count > MAX_CHILDREN) {
            while (t.getAttribute('cliqz-adb-blocked') === 'parent') {
              t.setAttribute('cliqz-adb-blocked', undefined);
              t = t.parentNode;
            }
            t.style.display = '';
            t.setAttribute('cliqz-adb-blocked', undefined);
          }
        }
      } catch(e) {}
    }
    if (!mutations[0].target.ownerDocument) {
      return;
    }
    var windowID = mutations[0].target.ownerDocument.windowID,
        domain = mutations[0].target.ownerDocument.domain;
    if (windowID) {
      // add nodes
      if (!this.tabsInfo[windowID].nodes) {
        this.tabsInfo[windowID].nodes = {
          groupCount: 0,
          count2node: {},
          id2count: {}
        };
      }
      this.tabsInfo[windowID].nodes.groupCount++;
      let c = this.tabsInfo[windowID].nodes.groupCount;
      for (let m of mutations) {
        // let hide = false;
        for (let n of m.addedNodes) {
          if (n.id && n.id !== 'cliqz-div-x') {
            if (!(c in this.tabsInfo[windowID].nodes.count2node)) {
              this.tabsInfo[windowID].nodes.count2node[c] = [];
            }
            this.tabsInfo[windowID].nodes.count2node[c].push(n);
            this.tabsInfo[windowID].nodes.id2count[n.id] = c;
          }
        }
      }
    }
  },
  addMutationObserver: function(windowID) {
    if (!this.tabsInfo[windowID].observerAdded) {
      var MutationObserver = utils.getWindow().MutationObserver;
      var mutationObserver = new MutationObserver(this.onMutation.bind(this));
      this.tabsInfo[windowID].doc.windowID = windowID;
      mutationObserver.observe(this.tabsInfo[windowID].doc, this.config);
      this.tabsInfo[windowID].observerAdded = true;
    }
  },
  addFrameMutationObserver: function(winID, frameDoc) {
    var MutationObserver = utils.getWindow().MutationObserver;
    var mutationObserver = new MutationObserver(this.onFrameMutation.bind(this));
    mutationObserver.observe(frameDoc, this.config);
  },
  onLocationChange: function(aProgress, aRequest, aURI) {
    if (aProgress.isLoadingDocument) {
      let windowID = aProgress.DOMWindowID;
      if (!(windowID in this.tabsInfo)) {
        this.tabsInfo[windowID] = {
          url: null,
          doc: null
        };
      }
      this.tabsInfo[windowID].url = aURI.spec;
      this.tabsInfo[windowID].doc = aProgress.DOMWindow.document;
      this.tabsInfo[windowID].observerAdded = false;
      this.tabsInfo[windowID].requests = {};
    }
  }
};
