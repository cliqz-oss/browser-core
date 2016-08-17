import { utils } from 'core/cliqz';
import { countChildren, MAX_CHILDREN } from 'adblocker/cosmetics';


export function MutationLogger() {
  this.tabsInfo = {};  // first party url
  this.config = {
    childList: true,
    subtree: true,
  };
}


MutationLogger.prototype = {
  onFrameMutation(mutations) {
    for (const m of mutations) {
      const t = m.target;
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
  onMutation(mutations) {
    for (const m of mutations) {
      let t = m.target;
      let count = 0;
      for (const added of m.addedNodes) {
        count = Math.max(count, countChildren(added));
      }
      try {
        if (t.getAttribute('cliqz-adb-blocked')) {
          if (countChildren(t) > MAX_CHILDREN || count > MAX_CHILDREN) {
            while (t.getAttribute('cliqz-adb-blocked') === 'parent') {
              t.setAttribute('cliqz-adb-blocked', undefined);
              t = t.parentNode;
            }
            t.style.display = '';
            t.setAttribute('cliqz-adb-blocked', undefined);
          }
        }
      } catch (e) { /* Ignore exception */ }
    }
    if (!mutations[0].target.ownerDocument) {
      return;
    }
    const windowID = mutations[0].target.ownerDocument.windowID;
    if (windowID) {
      // add nodes
      if (!this.tabsInfo[windowID].nodes) {
        this.tabsInfo[windowID].nodes = {
          groupCount: 0,
          count2node: {},
          id2count: {},
        };
      }
      this.tabsInfo[windowID].nodes.groupCount++;
      const c = this.tabsInfo[windowID].nodes.groupCount;
      for (const m of mutations) {
        // let hide = false;
        for (const n of m.addedNodes) {
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
  addMutationObserver(windowID) {
    if (!this.tabsInfo[windowID].observerAdded) {
      const MutationObserver = utils.getWindow().MutationObserver;
      const mutationObserver = new MutationObserver(this.onMutation.bind(this));
      this.tabsInfo[windowID].doc.windowID = windowID;
      mutationObserver.observe(this.tabsInfo[windowID].doc, this.config);
      this.tabsInfo[windowID].observerAdded = true;
    }
  },
  addFrameMutationObserver(winID, frameDoc) {
    const MutationObserver = utils.getWindow().MutationObserver;
    const mutationObserver = new MutationObserver(this.onFrameMutation.bind(this));
    mutationObserver.observe(frameDoc, this.config);
  },
  onLocationChange(aProgress, aRequest, aURI) {
    if (aProgress.isLoadingDocument) {
      const windowID = aProgress.DOMWindowID;
      if (!(windowID in this.tabsInfo)) {
        this.tabsInfo[windowID] = {
          url: null,
          doc: null,
        };
      }
      this.tabsInfo[windowID].url = aURI.spec;
      this.tabsInfo[windowID].doc = aProgress.DOMWindow.document;
      this.tabsInfo[windowID].observerAdded = false;
      this.tabsInfo[windowID].requests = {};
    }
  },
};
