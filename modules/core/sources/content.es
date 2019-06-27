/* global window, chrome */
import config from '../core/config';
// Load content scripts from modules
import '../module-content-script';
import {
  runContentScripts,
  registerContentScript,
  isTopWindow,
} from '../core/content/helpers';
import { waitFor } from '../core/helpers/wait';
import createSpananWrapper from '../core/helpers/spanan-module-wrapper';
import { chrome, window } from '../platform/content/globals';

const MAX_BUFFER_LEN = 5000;

function getContextHTML(ev) {
  let target = ev.target,
    count = 0,
    html;

  try {
    while (true) {
      html = target.innerHTML;

      if (html.indexOf('http://') !== -1 || html.indexOf('https://') !== -1) {
        return html;
      }

      target = target.parentNode;

      count += 1;
      if (count > 4) break;
    }
  } catch (ee) {
  }
}

const whitelist = [
  'chrome://cliqz/',
  'resource://cliqz/'
].concat(config.settings.frameScriptWhitelist);

registerContentScript('core', '*', (window, chrome, CLIQZ) => {
  const currentURL = () => window.location.href;

  function onCallback(msg) {
    if (isDead()) {
      return;
    }

    if (!whitelist.some(url => currentURL().indexOf(url) === 0)) {
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

  const fns = {
    postMessage(message) {
      window.postMessage(message, '*');
      return null;
    },
    getHTML() {
      return window.document.documentElement.outerHTML;
    },
    click(selector) {
      const el = window.document.querySelector(selector);
      try {
        el.click();
        return true;
      } catch (e) {
        return false;
      }
    },
    queryHTML(selector, attribute, {
      shadowRootSelector = null,
      attributeType = 'property',
    } = {}) {
      const root = shadowRootSelector
        ? window.document.querySelector(shadowRootSelector).shadowRoot
        : window.document;
      const attributes = attribute.split(',');

      const getAttr = (el, attr) => {
        if (attributeType === 'property') {
          return el[attr];
        }

        return el.getAttribute(attr);
      };

      const ret = Array.prototype.map.call(
        root.querySelectorAll(selector),
        (el) => {
          if (attributes.length > 1) {
            return attributes.reduce((hash, attr) => ({
              ...hash,
              [attr]: getAttr(el, attr),
            }), {});
          }
          return getAttr(el, attribute);
        }
      );

      return ret;
    },
    queryComputedStyle(selector) {
      const root = shadowRootSelector
        ? window.document.querySelector(shadowRootSelector).shadowRoot
        : window.document;

      const ret = Array.prototype.map.call(
        root.querySelectorAll(selector),
        (el) => {
          return window.getComputedStyle(el);
        });
      return ret;
    },
    getCookie() {
      try {
        return window.document.cookie;
      } catch (e) {
        if (e instanceof DOMException && e.name == 'SecurityError') {
          return null;
        }
        throw e; // let others bubble up
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

    const url = currentURL();

    let matchesCurrentUrl = msg.url === url;
    // wild card for cliqz URLS
    if (msg.url &&
        (msg.url.indexOf('resource://cliqz') === 0 ||
         msg.url.indexOf('chrome://cliqz') === 0)) {
      if (url.indexOf(msg.url) === 0) {
        matchesCurrentUrl = true;
      }
    }

    if (!matchesCurrentUrl) {
      return;
    }

    if (!(msg.action in fns)) {
      return;
    }

    try {
      payload = fns[msg.action].apply(null, msg.args || []);
      if (payload === null) {
        return;
      }
    } catch (e) {
      window.console.error('cliqz framescript:', e);
    }
    chrome.runtime.sendMessage({
      response: payload,
      requestId: msg.requestId,
    });
  }

  function proxyWindowEvent(action) {
    return function (ev) {
      CLIQZ.app.modules.core.action(action, {
        target: {
          baseURI: ev.target.baseURI,
        }
      });
    };
  }

  const onMouseDown = function (ev) {
    const linksSrc = [];
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

    let node = ev.target;
    if (node.nodeType !== 1) {
      node = node.parentNode;
    }

    let href = null;

    if (node.closest('a[href]')) {
      href = node.closest('a[href]').getAttribute('href');
    }

    const event = {
      target: {
        baseURI: ev.target.baseURI,
        value: ev.target.value,
        href: ev.target.href,
        parentNode: {
          href: ev.target.parentNode ? ev.target.parentNode.href : null
        },
        linksSrc,
      }
    };
    CLIQZ.app.modules.core.action('recordMouseDown', event, getContextHTML(ev), href);
  };

  const onReady = function () {
    // ReportLang
    const lang = window.document.getElementsByTagName('html')
      .item(0).getAttribute('lang');
    // don't analyse language for (i)frames
    if (!isTopWindow(window)) {
      return;
    }

    const title = window.document.querySelector('title');
    const description = window.document.querySelector('meta[name=description]');
    const ogTitle = window.document.querySelector('meta[property="og:title"]');
    const ogDescription = window.document.querySelector('meta[property="og:description"]');
    const ogImage = window.document.querySelector('meta[property="og:image"]');

    CLIQZ.app.modules.core.action('recordMeta', currentURL(), {
      title: title && title.innerHTML,
      description: description && description.content,
      ogTitle: ogTitle && ogTitle.content,
      ogDescription: ogDescription && ogDescription.content,
      ogImage: ogImage && ogImage.content,
      lang,
    });
  };

  function onBackgroundMessage(message) {
    // messages with windowId are responses to actions being called by content scripts
    // TODO: use chrome.runtime.sendMessage callbacks instead
    if (message.windowId) {
      onCallback(message);
    } else {
      onCore(message);
    }
  }

  window.addEventListener('mousedown', onMouseDown);
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
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('DOMContentLoaded', onReady);
  }

  function isDead() {
    try {
      currentURL();
      return false;
    } catch (e) {
      stop();
      return true;
    }
  }

  window.addEventListener('unload', stop);
});

(function () {
  // we only handle HTML documents for now
  if (window.document.documentElement.nodeName.toLowerCase() !== 'html') {
    return;
  }

  let hasRun = false;
  const actionWrappers = [];

  let buffer = [];
  function collectingBeforeContentScriptsReady(msg) {
    if (buffer.length < MAX_BUFFER_LEN) { buffer.push(msg); }
  }
  chrome.runtime.onMessage.addListener(collectingBeforeContentScriptsReady);

  function sendToContentScripts(contentScriptsOnMessage, msg) {
    const { module, action, args } = msg || {};
    const onmessage = (contentScriptsOnMessage[module] || {})[action];
    if (onmessage) { onmessage(...args); }
  }

  function runOnce(cliqz) {
    if (hasRun) {
      return;
    }

    hasRun = true;
    // augment CLIQZ global to add action support
    Object.keys(cliqz.app.modules).forEach((moduleName) => {
      const mod = cliqz.app.modules[moduleName];
      const wrapper = createSpananWrapper(moduleName);
      mod.action = wrapper.send.bind(wrapper);
      actionWrappers.push(wrapper);
    });
    chrome.runtime.onMessage.removeListener(collectingBeforeContentScriptsReady);
    chrome.runtime.onMessage.addListener((message) => {
      actionWrappers.forEach(wrapper => wrapper.handleMessage(message));
    });

    const contentScriptsOnMessage = runContentScripts(window, chrome, cliqz);
    buffer.forEach(msg => {
      try {
        sendToContentScripts(contentScriptsOnMessage, msg);
      } catch (e) {
        window.console.error(`CLIQZ content-script failed onmessage: ${e} ${e.stack}`);
      }
    });
    buffer = [];
    chrome.runtime.onMessage.addListener(msg =>
      sendToContentScripts(contentScriptsOnMessage, msg));
  }

  if (typeof CLIQZ !== 'undefined' && CLIQZ.app) {
    runOnce(CLIQZ);
  } else {
    window.runCliqz = runOnce;

    const getApp = () => new Promise((resolve, reject) => {
      if (hasRun) {
        // resolve to break waitFor loop - runOnce will prevent scripts running again
        resolve({});
        return;
      }

      chrome.runtime.sendMessage({
        module: 'core',
        action: 'status',
      }, (reply) => {
        if (hasRun || chrome.runtime.lastError || !reply) {
          reject('hasRun');
          return;
        }
        resolve({ app: reply.response });
      });
    });

    waitFor(getApp)
      .then(runOnce, () => {});
  }
}());
