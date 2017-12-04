/* global window, chrome */
import config from '../core/config';
// Load content scripts from modules
import '../module-content-script';
import { getWindowId, getWindowTreeInformation, runContentScripts,
  CHROME_MSG_SOURCE, isCliqzContentScriptMsg, getDocumentUrl } from '../core/content/helpers';
import { throttle } from '../core/decorators';

if (typeof windowId === 'undefined') {
  window.windowId = getWindowId();
}

function getContextHTML(ev) {
  var target = ev.target,
      count = 0,
      html;

  try {
    while(true) {
      html = target.innerHTML;

      if (html.indexOf('http://') !==-1 || html.indexOf('https://') !==-1 ) {

        return html;

      }

      target = target.parentNode;

      count+=1;
      if (count > 4) break;
    }
  } catch(ee) {
  }
}

const whitelist = [
  'chrome://cliqz/',
  'resource://cliqz/'
].concat(config.settings.frameScriptWhitelist);

(function onDOMWindowCreated() {
try {

  // we only handle HTML documents for now
  if(window.document.documentElement.nodeName.toLowerCase() !== 'html'){
    return;
  }

  const windowTreeInformation = getWindowTreeInformation(window);
  const currentURL = () => window.location.href;
  const url = currentURL();


  let onMessage = function (ev) {
    let href = ev.target.location.href;

    if (!whitelist.some(function (url) { return href.indexOf(url) === 0; }) ) {
      return;
    }

    let message = {};

    try {
      message = JSON.parse(ev.data);
    } catch (e) {
      // non Cliqz or invalid message should be ignored
    }

    if (message.target !== 'cliqz') {
      return;
    }

    if (message.type === 'response') {
      return;
    }

    chrome.runtime.sendMessage({
      source: CHROME_MSG_SOURCE,
      origin: 'content',
      windowId: windowId,
      payload: message
    });
  };

  function onCallback(msg) {
    if (isDead()) {
      return;
    }

    if (!whitelist.some(function (url) { return currentURL().indexOf(url) === 0; }) ) {
      return;
    }

    if (msg.origin === 'content') {
      window.postMessage(JSON.stringify({
        target: 'cliqz',
        type: 'response',
        response: msg.response,
        action: msg.action,
        module: msg.module,
        requestId: msg.requestId,
      }), '*');
    }
  }

  let fns = {
    postMessage: function (message) {
      window.postMessage(message, '*');
    },
    getHTML: function () {
      return window.document.documentElement.outerHTML;
    },
    queryHTML: function (selector, attribute) {
      let attributes = attribute.split(',');

      return Array.prototype.map.call(
        window.document.querySelectorAll(selector),
        function (el) {
          if (attributes.length > 1) {
            return attributes.reduce( function (hash, attr) {
              hash[attr] = el[attr];
              return hash;
            }, {});
          } else {
            return el[attribute];
          }
        }
      );
    },
    getCookie: function () {
      try {
        return window.document.cookie;
      } catch (e) {
        if (e instanceof DOMException && e.name == 'SecurityError') {
          return null;
        } else {
          throw e; // let others bubble up
        }
      }
    }
  };

  function onCore(msg) {
    let payload;

    if (isDead()) {
      return;
    }

    if (msg.action === 'unload') {
      stop();
      return;
    }

    if (msg.action === 'getHTML') {
      msg.url = decodeURIComponent(msg.url);
    }

    let matchesCurrentUrl = msg.url === currentURL();
    // wild card for cliqz URLS
    if(msg.url &&
        (msg.url.indexOf('resource://cliqz') === 0 ||
         msg.url.indexOf('chrome://cliqz') === 0)) {
      if(currentURL().indexOf(msg.url) === 0){
        matchesCurrentUrl = true;
      }
    }

    if (!matchesCurrentUrl) {
      return;
    }

    if ( !(msg.action in fns) ) {
      return;
    }

    try {
      payload = fns[msg.action].apply(null, msg.args || []);
      if (payload === null){
        return
      }
    } catch (e) {
      window.console.error('cliqz framescript:', e);
    }

    chrome.runtime.sendMessage({
      source: CHROME_MSG_SOURCE,
      origin: 'content',
      payload: payload,
      requestId: msg.requestId
    });
  }

  function proxyWindowEvent(action) {
    return function (ev) {
      chrome.runtime.sendMessage({
        source: CHROME_MSG_SOURCE,
        windowId: windowId,
        payload: {
          module: 'core',
          action: action,
          args: [
            {
              target: {
                baseURI: ev.target.baseURI,
                windowTreeInformation: windowTreeInformation,
              }
            }
          ]
        }
      });
    };
  }

  let onMouseDown = function (ev) {
    const linksSrc = []
    if (window.parent !== window) {
      // collect srcipt links only for frames
      if (window.document && window.document.scripts) {
        for (let i = 0; i < window.document.scripts.length; i += 1) {
          const src = window.document.scripts[i].src;
          if (src.startsWith('http')) {
            linksSrc.push(src);
          }
        }
      }
    }
    let parentURI = getDocumentUrl(window);
    let node = ev.target;
    if (node.nodeType !== 1) {
      node = node.parentNode;
    }

    let href = null;

    if (node.closest('a[href]')) {
      href = node.closest('a[href]').getAttribute('href');
    }

    chrome.runtime.sendMessage({
      source: CHROME_MSG_SOURCE,
      windowId: windowId,
      payload: {
        module: 'core',
        action: 'recordMouseDown',
        args: [
          {
            target: {
              windowTreeInformation: windowTreeInformation,
              baseURI: ev.target.baseURI,
              value: ev.target.value,
              href: ev.target.href,
              parentNode: {
                href: ev.target.parentNode.href
              },
              linksSrc,
              parentURI
            }
          },
          getContextHTML(ev),
          href
        ]
      }
    });
  };

  let onReady = function (event) {
    // ReportLang
    let lang = window.document.getElementsByTagName('html')
      .item(0).getAttribute('lang');
    // don't analyse language for (i)frames
    let isTopWindow = !event.target.defaultView.frameElement;

    if (isTopWindow && lang) {
      chrome.runtime.sendMessage({
        source: CHROME_MSG_SOURCE,
        windowId: windowId,
        payload: {
          module: 'core',
          action: 'recordLang',
          args: [
            currentURL(),
            lang
          ]
        }
      });
    }

    // ReportMeta
    let title = window.document.querySelector('title'),
        description = window.document.querySelector('meta[name=description]'),
        ogTitle = window.document.querySelector('meta[property="og:title"]'),
        ogDescription = window.document.querySelector('meta[property="og:description"]'),
        ogImage = window.document.querySelector('meta[property="og:image"]');

    if (isTopWindow) {
      chrome.runtime.sendMessage({
        source: CHROME_MSG_SOURCE,
        windowId: windowId,
        payload: {
          module: 'core',
          action: 'recordMeta',
          args: [
            currentURL(),
            {
              title: title && title.innerHTML,
              description: description && description.content,
              ogTitle: ogTitle && ogTitle.content,
              ogDescription: ogDescription && ogDescription.content,
              ogImage: ogImage && ogImage.content
            }
          ]
        }
      });
    }
  };

  function onBackgroundMessage(message) {
    if (!isCliqzContentScriptMsg(message)) {
      return;
    }
    if (message.windowId === windowId) {
      onCallback(message);
    } else {
      onCore(message);
    }
  }

  runContentScripts(window, chrome, windowId);

  const onKeyPress = throttle(window, proxyWindowEvent('recordKeyPress'), 250);
  const onMouseMove = throttle(window, proxyWindowEvent('recordMouseMove'), 250);
  const onScroll = throttle(window, proxyWindowEvent('recordScroll'), 250);
  const onCopy = throttle(window, proxyWindowEvent('recordCopy'), 250);

  window.addEventListener('message', onMessage);
  window.addEventListener('keypress', onKeyPress);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('scroll', onScroll);
  window.addEventListener('copy', onCopy);
  window.addEventListener('DOMContentLoaded', onReady);
  chrome.runtime.onMessage.addListener(onBackgroundMessage);

  function stop(ev) {
    if (ev && (ev.target !== window.document)) {
      return;
    }

    // detect dead windows
    // https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Errors/Dead_object
    try {
      String(window);
    } catch (e) {
      return;
    }

    chrome.runtime.onMessage.removeListener(onBackgroundMessage);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('keypress', onKeyPress);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('copy', onCopy);
    window.removeEventListener('DOMContentLoaded', onReady);
  }

  function isDead() {
    try {
      currentURL();
      return false;
    } catch(e) {
      stop();
      return true;
    }
  }

  window.addEventListener('unload', stop);
} catch(e) {
  window.console.error('Content Script error', e);
}
})(this);
