import ContentPolicy from 'adblocker/content-policy';
import CliqzADB, { autoBlockAds } from 'adblocker/adblocker';
import { log } from 'adblocker/utils';


export const MAX_CHILDREN = 1;
const MIN_CHILDREN_HEIGHT = 0.1;
const MIN_EXPAND_RATE = 0.05;
const CONTENT_TAG = new Set([
  'DIV', 'IFRAME', 'LI', 'SECTION', 'A', 'UL', 'P',
  'SPAN', 'ARTICLE', 'INPUT', 'MAIN', 'HEADER', 'VIDEO', 'FORM',
  'H1', 'H2', 'H3', 'H4', 'H5', 'FOOTER', 'BR',
]);


function isVideoFrame(frame) {
  const doc = frame.contentWindow.document;
  return doc.querySelectorAll('VIDEO').length > 0;
}


function isPossibleContent(node) {
  // normal size video frame
  // const isVideoFrame =  node.offsetHeight >= 360 && node.offsetWidth >= 640;

  if (!node.ownerDocument || !node.ownerDocument.body) {
    return true;
  }
  // if the node is bigger than 1/3 of the body height and height, we consider it as content
  const bigContent = node.offsetHeight / node.ownerDocument.body.offsetHeight > 0.33 &&
                     node.offsetWidth / node.ownerDocument.body.offsetWidth > 0.33;

  log(`${node.offsetHeight} ${node.offsetWidth}` +
      `${node.ownerDocument.body.offsetHeight} ` +
      `${node.ownerDocument.body.offsetWidth} ` +
      `${node.className}`);

  return bigContent;
}


function countChildren(node) {
  let count = 0;
  if (!node || !node.children) {
    return count;
  }
  for (const n of node.children) {
    // ignore empty nodes
    try {
      if (n.style.display === 'none' && n.innerHTML === '' && n.tagName !== 'IFRAME') {
        continue;
      }
    } catch (e) { /* Ignore exception */ }

    const tag = n.tagName;
    if (CONTENT_TAG.has(tag)) {
      count++;
    }
  }
  log(`${node.id} ${node.tagName} ${node.className} ${count}`);
  return count;
}


function areaIncreased(child, parent) {
  const aChild = child.offsetHeight * child.offsetWidth;
  const aParent = parent.offsetHeight * parent.offsetWidth;
  if (aChild === 0) {
    return 10000;
  }
  return (aParent - aChild) / aChild;
}


function compareChildrenHeight(node) {
  const pct = 1;
  if (!node || !node.children) {
    return pct;
  }
  if (node.offsetHeight === 0) {
    return 0;
  }

  let childrenHeight = 0;
  for (const n of node.children) {
    childrenHeight += n.offsetHeight;
  }
  return childrenHeight / node.offsetHeight;
}


function locateParent(node) {
  // Given a source node of ad request, find the possible parent node containing the ad
  const searchHistory = [];
  searchHistory.push(`${node.id} ${node.className} ${node.tagName}`);
  if (!node.parentNode) {
    log(searchHistory);
    return node;
  }

  let child = node;
  let parent = node.parentNode;
  const isWholeDoc = function isWholeDoc(n) {
    return n.nodeName === '#document' || n.tagName === 'BODY' || n.nodeName === 'HTML';
  };

  for (const c of parent.children) {
    if (countChildren(c) >= MAX_CHILDREN || isPossibleContent(c)) {
      return child;
    }
  }

  while (parent && !isWholeDoc(parent)) {
    const count = countChildren(parent);
    const incr = areaIncreased(child, parent);
    const childrenHeight = compareChildrenHeight(parent);
    if ((count <= MAX_CHILDREN ||
          incr < MIN_EXPAND_RATE ||
          childrenHeight < MIN_CHILDREN_HEIGHT) &&
        !isPossibleContent(parent)) {
      child.setAttribute('cliqz-adb-blocked', 'parent');
      child = parent;
      parent = parent.parentNode;
      searchHistory.push(`${child.id} ${child.className} ${child.tagName} ${count} ${incr}`);
    } else {
      break;
    }
  }
  log(searchHistory);
  log(`${child.id} ${child.tagName} ${child.className}`);

  return child;
}


function checkFrame(tabId, frameId, url) {
  if (!CliqzADB.cacheADB) {
    CliqzADB.cacheADB = {};
  }
  if (!CliqzADB.cacheADB[tabId]) {
    // TODO: need to clean these
    CliqzADB.cacheADB[tabId] = [];
  }

  const curID = frameId;
  if (curID) {
    log(`frame id ${curID}`);
    CliqzADB.cacheADB[tabId].push(curID);
  }

  const tmp = [];
  for (const d of CliqzADB.cacheADB[tabId]) {
    if (!(tabId in CliqzADB.mutationLogger.tabsInfo)) {
      continue;
    }
    const nInfo = CliqzADB.mutationLogger.tabsInfo[tabId].nodes;
    if (d in nInfo.id2count) {
      log(`found ${d} ${nInfo.id2count[d]}`);
      const count = nInfo.id2count[d];
      for (let n of nInfo.count2node[count]) {
        if (n === undefined ||
            n.tagName !== 'IFRAME' ||
            n.getAttribute('cliqz-adblocker' === 'safe')) {
          continue;
        }

        n = locateParent(n);
        if (n.getAttribute('cliqz-adblocker') !== 'safe') {
          if (!isPossibleContent(n)) {
            n.style.display = 'none';
            try {
              n.setAttribute('cliqz-adb', `from source1: ${url}`);
            } catch (e) { /* Ignore exception */ }
          }
        }
      }
    } else {
      tmp.push(curID);
    }
  }
  CliqzADB.cacheADB[tabId] = tmp;
}


function locateSource(requestContext) {
  let source = requestContext.getSourceURL();
  const url = requestContext.url;
  let sourceNode = null;

  if (source in ContentPolicy.requests2dom && !(url in ContentPolicy.requests2dom[source])) {
    source = requestContext.getReferrer();
  }

  if (source in ContentPolicy.requests2dom && url in ContentPolicy.requests2dom[source]) {
    sourceNode = ContentPolicy.requests2dom[source][url];
  } else {
    // fall back to the frame if possible
    const outWinId = requestContext.getOuterWindowID();
    const oriWinId = requestContext.getOriginWindowID();
    if (outWinId !== oriWinId) {
      const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
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

  const frames = node.querySelectorAll('IFRAME');
  for (const frame of frames) {
    if (isVideoFrame(frame)) {
      return true;
    }
  }

  return false;
}


function isFlash(node) {
  if (node.tagName === 'OBJECT' && node.getAttribute('type') === 'application/x-shockwave-flash') {
    return true;
  }

  return false;
}


function markNodeAsSafe(node) {
  try {
    node.setAttribute('cliqz-adblocker', 'safe');
  } catch (e) { /* Ignore exception */ }
}

function hide(node, url, source) {
  if (autoBlockAds()) {
    try {
      if (node.getAttribute('cliqz-adblocker') === 'safe') {
        return;
      }
      node.style.display = 'none';
      node.setAttribute('cliqz-adb-blocked', `from source: ${url}`);
    } catch (e) { /* Ignore exception */ }
    CliqzADB.adbStats.pages[source] = (CliqzADB.adbStats.pages[source] || 0) + 1;
  }
}


function hideNodes(requestContext) {
  log(`hideNodes for ${requestContext.url}`);
  const source = locateSource(requestContext);
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

  hide(locateParent(source), requestContext.url, requestContext.getSourceURL());

  if (isFromFrame(requestContext)) {
    // hideCompanyFrames(source);
    const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
          .getService(Components.interfaces.nsIWindowMediator);
    const outWinId = requestContext.getOuterWindowID();
    const frame = wm.getOuterWindowWithId(outWinId).frameElement;
    if (isVideoFrame(frame) || isPossibleContent(frame)) {
      markNodeAsSafe(frame);
      return;
    }
    hide(locateParent(frame), requestContext.url, requestContext.getSourceURL());
    CliqzADB.mutationLogger.addFrameMutationObserver(outWinId, frame.contentWindow.document);
    checkFrame(requestContext.getOriginWindowID(), frame.id, requestContext.url, false);
  }
}


export {
  hideNodes,
  locateParent,
  checkFrame,
  countChildren,
};
