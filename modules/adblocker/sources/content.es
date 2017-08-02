var mutationObserver, injectedRules;
import { registerContentScript } from '../core/content/helpers';

registerContentScript('http*', (window, chrome, windowId) => {
  function throttle(fn, threshhold) {
    let last, timer;
    return function() {
      let context = this;

      let now = +new Date,
          args = arguments;
      if (last && now < last + threshhold) {
        // reset timeout
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, threshhold);
      } else {
        last = now;
        fn.apply(context, args);
      }
    };
  }

  let url = window.location.href;

  injectedRules = {};

  // requestDomainRules
  if (url === window.parent.document.documentURI) {
    let payload = {
      module: 'adblocker',
      action: 'url',
      args:[
        url
      ]
    }

    chrome.runtime.sendMessage({
      windowId,
      payload
    })
  }

  window.addEventListener('DOMContentLoaded', () => {
    adbCosmFilter(url, window, chrome.runtime.sendMessage, windowId, throttle);
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.windowId === windowId) {
      if (msg && msg.response && msg.response.type === 'domain-rules') {
        if (!msg.response.active) {
          clearAdb();
          return;
        }
        let scripts = msg.response.scripts;
        scripts.forEach(script => injectScript(script, window.document));
        msg.response.scriptBlock.forEach(s => blockScript(s, window.document));

        let rules = msg.response.styles;
        handleRules(rules, window);
      }

      if (msg && msg.response && msg.response.rules) {
        if (!msg.response.active) {
          clearAdb();
          return;
        }
        let rules = msg.response.rules;
        handleRules(rules, window);
      }
    }
  });
});

function adbCosmFilter(url, window, send, windowId, throttle) {
  if (!url || url[0] !== 'h') {
    return;
  }
  var addNodeName = function(node, nodeInfo) {
    // ignore hidden nodes
    if (node.offsetWidth === 0 && node.offsetWidth === 0) {
      return;
    }
    if (node.id) {
      nodeInfo.add(`#${node.id}`);
    }
    if (node.tagName) {
      nodeInfo.add(node.tagName);
    }
    if (node.className && node.className.split) {
      node.className.split(' ').forEach(name => nodeInfo.add(`.${name}`));
    }
  }

  var sendNodeNames = function(nodeInfo) {
    while (url !== window.parent.document.documentURI) {
      // this might came from an iframe
      // use parent url
      url = window.parent.document.documentURI;
      window = window.parent;
    }
    if (!url || !nodeInfo.size) {
      return;
    }
    let nodesArray = [...nodeInfo];
    for (let n of nodeInfo) {
      nodesArray.push(n);
    }
    let payload = {
      module: 'adblocker',
      action: 'nodes',
      args: [
        url,
        [nodesArray]
      ]
    }
    send({
      windowId,
      payload
    })
  }

  var checkMutation = function(docMutation, nodeInfo) {
    if (!docMutation || docMutation.size === 0) {
      return;
    }
    for (let target of docMutation.values()) {
      let nodes = target.querySelectorAll('*');
      for (let node of nodes) {
        addNodeName(node, nodeInfo);
      }
    }
  }

  var onMutation = function(mutations) {
    var docMutation = new Set();
    var nodeInfo = new Set();

    for (let m of mutations) {
      let target = m.target;
      if (target) {
        docMutation.add(target);
      }
    }

    if (docMutation.size > 100) {
      //in case there are too many mutations we will only check once the whole document
      checkMutation(new Set([window.document]), nodeInfo);
    }
    checkMutation(docMutation, nodeInfo);
    sendNodeNames(nodeInfo);
  }

  // attach mutation obsever in case new nodes are added
  mutationObserver = new window.MutationObserver(mutations => onMutation(mutations));
  mutationObserver.observe(window.document, {childList: true, subtree: true});
}

function clearAdb() {
  if (mutationObserver) {
    try {
      mutationObserver.disconnect();
    }
    catch (e) {
      /* in case the page is closed */
    }
  }
}

function handleRules(rules, window) {
  if (!rules) {
    return;
  }
  let rulesStr = '';
  for (let rule of rules)  {
    if (rule in injectedRules) {
      continue;
    } else {
      try {
        let find = window.document.querySelectorAll(rule);
        if (!find.length) {
          continue;
        }
      } catch(e) {  // invalid selector
        continue;
      }
      injectedRules[rule] = true;
      if (rulesStr) {
        rulesStr += ', ';
      }
      rulesStr += ` :root ${rule}`;
    }
  }
  if (rulesStr) {
    rulesStr += ' {display:none !important;}';
    injectCSSRule(rulesStr, window.document);
  }
}

function injectCSSRule(rule, doc) {
  let css = doc.createElement('style');
  css.type = 'text/css';
  css.id = 'cliqz-adblokcer-css-rules'
  doc.getElementsByTagName("head")[0].appendChild(css);
  css.appendChild(doc.createTextNode(rule));
}

function injectScript(s, doc) {
  let script = doc.createElement('script');
  script.type = 'text/javascript';
  script.id = 'cliqz-adblocker-script';
  script.textContent = s;
  doc.getElementsByTagName("head")[0].appendChild(script);
}

function blockScript(filter, document) {
  filter = new RegExp(filter);
  document.addEventListener('beforescriptexecute', function(ev) {
    if (filter.test(ev.target.textContent)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  });
};
