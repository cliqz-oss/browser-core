var mutationObserver, injectedRules;

var requestDomainRules = function(url, window, send, windowId) {
  while (url !== window.parent.document.documentURI) {
    // this might came from an iframe
    // use parent url
    url = window.parent.document.documentURI;
    window = window.parent;
  }
  injectedRules = {};
  if (!url || url[0] !== 'h') {
    return;
  }

  let payload = {
    module: 'adblocker',
    action: 'url',
    args:[
      url
    ]
  }

  send({
    windowId,
    payload
  })
}

var adbCosmFilter = function(url, window, send, windowId, throttle) {
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
      nodes = target.querySelectorAll('*');
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

function responseAdbMsg(msg, window) {
  if (msg.data && msg.data.response && msg.data.response.type === 'domain-rules') {
    if (!msg.data.response.active) {
      clearAdb();
      return;
    }
    let scripts = msg.data.response.scripts;
    scripts.forEach(script => injectScript(script, window.document));
    msg.data.response.scriptBlock.forEach(s => blockScript(s, window.document));

    let rules = msg.data.response.styles;
    handleRules(rules, window);
  }

  if (msg.data && msg.data.response && msg.data.response.rules) {
    if (!msg.data.response.active) {
      clearAdb();
      return;
    }
    let rules = msg.data.response.rules;
    handleRules(rules, window);
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
