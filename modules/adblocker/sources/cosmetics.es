import ContentPolicy from 'adblocker/content-policy';
import CliqzADB, { autoBlockAds } from 'adblocker/adblocker';
import { log } from 'adblocker/utils';

export const MAX_CHILDREN = 1;
const MIN_CHILDREN_HEIGHT = 0.1,
      MIN_EXPAND_RATE = 0.05;

function isPossibleContent(node) {
  // normal size video frame
  // const isVideoFrame =  node.offsetHeight >= 360 && node.offsetWidth >= 640;

  if (!node.ownerDocument || !node.ownerDocument.body) {
    return isVideoFrame;
  }
  // if the node is bigger than 1/3 of the body height and height, we consider it as content
  const bigContent = node.offsetHeight / node.ownerDocument.body.offsetHeight > 0.33 &&
                    node.offsetWidth / node.ownerDocument.body.offsetWidth > 0.33;
  log(node.offsetHeight + ' ' + node.offsetWidth + ' ' + node.ownerDocument.body.offsetHeight + ' ' + node.ownerDocument.body.offsetWidth + ' ' + node.className);
  return bigContent;
}

function checkFrame(tabId, frameId, url, button) {
  if (!CliqzADB.cacheADB) {
    CliqzADB.cacheADB = {};
  }
  if (!CliqzADB.cacheADB[tabId]) {
    // todo: need to clean these
    CliqzADB.cacheADB[tabId] = [];
  }

  let curID = frameId;
  if (curID) {
    log('frame id ' + curID);
    CliqzADB.cacheADB[tabId].push(curID);
  }

  var tmp = [];
  for (let d of CliqzADB.cacheADB[tabId]) {
    if (!(tabId in CliqzADB.mutationLogger.tabsInfo)) {
      continue;
    }
    var nInfo = CliqzADB.mutationLogger.tabsInfo[tabId].nodes;
    if (d in nInfo.id2count) {
      log('found ' + d + ' ' + nInfo.id2count[d]);
      var count = nInfo.id2count[d];
      for (let n of nInfo.count2node[count]) {
        if (n === undefined || n.tagName !== 'IFRAME' || n.getAttribute('cliqz-adblocker' === 'safe')) {
          continue;
        }

        n = locateParent(n);
        if (n.getAttribute('cliqz-adblocker') !== 'safe') {
          if (!isPossibleContent(n)) {
            n.style.display = 'none';
            try {
              n.setAttribute('cliqz-adb', 'from source1: ' + url);
            } catch (e) {}
          }
        }
      }
    } else {
      tmp.push(curID);
    }
  }
  CliqzADB.cacheADB[tabId] = tmp;
};

function locateSource(requestContext) {
  let source = requestContext.getSourceURL(),
      url = requestContext.url,
      sourceNode = null;

  if (source in ContentPolicy.requests2dom && !(url in ContentPolicy.requests2dom[source])) {
    source = requestContext.getReferrer();
  }

  if (source in ContentPolicy.requests2dom && url in ContentPolicy.requests2dom[source]) {
    sourceNode = ContentPolicy.requests2dom[source][url];
  } else {
    // fall back to the frame if possible
    const outWinId = requestContext.getOuterWindowID(),
          oriWinId = requestContext.getOriginWindowID();
    if (outWinId !== oriWinId) {
      let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
        .getService(Components.interfaces.nsIWindowMediator);
      sourceNode = wm.getOuterWindowWithId(outWinId).frameElement;
    }
  }
  return sourceNode;
}

function isFromFrame(requestContext) {
  return requestContext.getOuterWindowID() !== requestContext.getOriginWindowID();
  // return node.tagName === 'IFRAME';
}

function containsVideo(node) {
  if (node.querySelectorAll('VIDEO').length > 0) {
    return true;
  }
  let frames = node.querySelectorAll('IFRAME');
  for (let frame of frames) {
    if (isVideoFrame(frame)) {
      return true;
    }
  }
}


function isVideoFrame(frame) {
  let doc = frame.contentWindow.document;
  return doc.querySelectorAll('VIDEO').length > 0;
}

function isFlash(node) {
  if (node.tagName === 'OBJECT' && node.getAttribute('type') === 'application/x-shockwave-flash') {
    return true;
  }
}

function markNodeAsSafe(node) {
  try{
    node.setAttribute('cliqz-adblocker', 'safe');
  } catch(e) {}
}

const contentTag = new Set(['DIV', 'IFRAME', 'LI', 'SECTION', 'A', 'UL', 'P',
                       'SPAN', 'ARTICLE', 'INPUT', 'MAIN', 'HEADER', 'VIDEO', 'FORM',
                       'H1', 'H2', 'H3', 'H4', 'H5', 'FOOTER', 'BR']);

function countChildren(node) {
  let count = 0;
  if (!node || !node.children) {
    return count;
  }
  for (let n of node.children) {
    // ignore empty nodes
    try {
      if (n.style.display === 'none' && n.innerHTML === '' && n.tagName !== 'IFRAME') {
        continue;
      }
    } catch(e) {}
    let tag = n.tagName;
    if (contentTag.has(tag)) {
      count++;
    }
  }
  log(node.id + ' ' + node.tagName + ' ' + node.className + ' ' + count);
  return count;
}

function compareChildrenHeight(node) {
  let pct = 1;
  if (!node || !node.children) {
    return pct;
  }
  if (node.offsetHeight === 0) {
    return 0;
  }

  let childrenHeight = 0;
  for (let n of node.children) {
    childrenHeight += n.offsetHeight;
  }
  return childrenHeight / node.offsetHeight;
}

function areaIncreased(child, parent) {
  let aChild = child.offsetHeight * child.offsetWidth,
      aParent = parent.offsetHeight * parent.offsetWidth;
  if (aChild === 0) {
    return 10000;
  }
  return (aParent - aChild) / aChild;
}

function locateParent(node) {
  // Given a source node of ad request, find the possible parent node containing the ad
  let searchHistory = [];
  searchHistory.push(node.id + ' ' + node.className + ' ' + node.tagName);
  if (!node.parentNode) {
    log(searchHistory);
    return node;
  }
  let child = node,
      parent = node.parentNode,
      isWholeDoc = function(node) {
        return node.nodeName === '#document' || node.tagName === 'BODY' || node.nodeName === 'HTML'
      }
  while (parent && !isWholeDoc(parent)) {
    let count = countChildren(parent),
        incr = areaIncreased(child, parent),
        childrenHeight = compareChildrenHeight(parent);
    if ((count <= MAX_CHILDREN || incr < MIN_EXPAND_RATE || childrenHeight < MIN_CHILDREN_HEIGHT) && !isPossibleContent(parent)) {
      child.setAttribute('cliqz-adb-blocked', 'parent');
      child = parent;
      parent = parent.parentNode;
      searchHistory.push(child.id + ' ' + child.className + ' ' + child.tagName + ' ' + count + ' ' + incr);
    } else {
      break;
    }
  }
  log(searchHistory);
  log(child.id + ' ' + child.tagName + ' ' + child.className);
  return child;
}

function hide(node, url, source) {
  if (autoBlockAds()) {
    try {
      if (node.getAttribute('cliqz-adblocker') === 'safe') {
        return;
      }
      node.style.display = 'none';
      node.setAttribute('cliqz-adb-blocked', 'from source: ' + url);
    } catch(e) {}
    CliqzADB.adbStats['pages'][source] = (CliqzADB.adbStats['pages'][source] || 0) + 1;
  }
}

function hideNodes(requestContext) {
  log('hideNodes for ' + requestContext.url);
  let source = locateSource(requestContext);
  if (!source) {
    return;  // We cannot do anything if we failed to determin the element originated the request
  }

  if (containsVideo(source)) {
    markNodeAsSafe(source);
    return;
  }

  if (isFlash(source) && source.getAttribute('data') !== requestContext.url) {
    return;
  }

  let parent = locateParent(source);
  hide(parent, requestContext.url, requestContext.getSourceURL());

  if (isFromFrame(requestContext)) {
    // hideCompanyFrames(source);
    let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
          .getService(Components.interfaces.nsIWindowMediator),
        outWinId = requestContext.getOuterWindowID(),
        frame = wm.getOuterWindowWithId(outWinId).frameElement;
    if (isVideoFrame(frame) || isPossibleContent(frame)) {
      markNodeAsSafe(frame);
      return;
    }
    let parent = locateParent(frame);
    hide(parent, requestContext.url, requestContext.getSourceURL());
    CliqzADB.mutationLogger.addFrameMutationObserver(outWinId, frame.contentWindow.document);
    checkFrame(requestContext.getOriginWindowID(), frame.id, requestContext.url, false);
  }
}

export {
  hideNodes,
  locateParent,
  checkFrame,
  countChildren
};
