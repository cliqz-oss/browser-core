

/**
 * Get the url of the top window.
 */
function getDocumentUrl(url, window) {
  let currentWindow = window;
  let currentUrl = url;

  while (currentUrl !== currentWindow.parent.document.documentURI) {
    currentUrl = currentWindow.parent.document.documentURI;
    currentWindow = currentWindow.parent;
  }

  return currentUrl;
}


function isMainDocument(url, window) {
  return url === window.parent.document.documentURI;
}


function injectCSSRule(rule, doc) {
  const css = doc.createElement('style');
  css.type = 'text/css';
  css.id = 'cliqz-adblokcer-css-rules';
  doc.getElementsByTagName('head')[0].appendChild(css);
  css.appendChild(doc.createTextNode(rule));
}


function injectScript(s, doc) {
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.id = 'cliqz-adblocker-script';
  script.textContent = s;
  doc.getElementsByTagName('head')[0].appendChild(script);
}


function blockScript(filter, document) {
  const filterRE = new RegExp(filter);
  document.addEventListener('beforescriptexecute', (ev) => {
    if (filterRE.test(ev.target.textContent)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  });
}


/**
 * Takes care of injecting cosmetic filters in a given window. Responsabilities:
 * - Inject scripts.
 * - Block scripts.
 * - Inject CSS rules.
 * - Monitor changes using a mutation observer and inject new rules if needed.
 *
 * All this happens by communicating with the background through the
 * `backgroundAction` function (to trigger request the sending of new rules
 * based on a domain or node selectors) and the `handleResponseFromBackground`
 * callback to apply new rules.
 */
export default class {
  constructor(url, window, backgroundAction) {
    this.documentUrl = getDocumentUrl(url, window);
    this.url = url;
    this.window = window;
    this.backgroundAction = backgroundAction;

    this.mutationObserver = null;
    this.injectedRules = new Set();
  }

  unload() {
    if (this.mutationObserver) {
      try {
        this.mutationObserver.disconnect();
      } catch (e) {
        /* in case the page is closed */
      }
    }
  }

  /**
   * When one or several mutations occur in the window, extract caracteristics
   * (node name, class, tag) from the modified nodes and request matching
   * cosmetic filters to inject in the page.
   */
  onMutation(mutations) {
    let targets = new Set(mutations.map(m => m.target).filter(t => t));
    if (targets.size > 100) {
      // In case there are too many mutations we will only check once the whole document
      targets = new Set([this.window.document]);
    }

    if (targets.size === 0) {
      return;
    }

    // Collect nodes of targets
    const nodeInfo = new Set();
    targets.forEach((target) => {
      const nodes = target.querySelectorAll('*');
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];

        // Ignore hidden nodes
        if (node.offsetWidth === 0 && node.offsetHeight === 0) {
          /* eslint-disable no-continue */
          continue;
        }

        if (node.id) {
          nodeInfo.add(`#${node.id}`);
        }

        if (node.tagName) {
          nodeInfo.add(node.tagName);
        }

        if (node.className && node.className.split) {
          node.className.split(' ').forEach((name) => {
            nodeInfo.add(`.${name}`);
          });
        }
      }
    });

    // Send node info to background to request corresponding cosmetic filters
    if (nodeInfo.size > 0) {
      this.backgroundAction('getCosmeticsForNodes', this.documentUrl, [[...nodeInfo]]);
    }
  }

  onDOMContentLoaded() {
     // Request rules for domain
    if (isMainDocument(this.url, this.window)) {
      this.backgroundAction('getCosmeticsForDomain', this.url);
    }

    // TODO - is this necessary? Can a cosmetic filter apply to an element of
    // the DOM?
    // Trigger sending of the cosmetic fitlers for the full page
    // this.onMutation([{ target: this.window.document }]);

    // attach mutation obsever in case new nodes are added
    this.mutationObserver = new this.window.MutationObserver(
      mutations => this.onMutation(mutations)
    );
    this.mutationObserver.observe(
      this.window.document,
      { childList: true, subtree: true }
    );
  }

  handleRules(rules) {
    const rulesToInject = [];

    // Check which rules should be injected in the page
    // TODO - this check could be remoted all together. It would make the
    // injection faster at the price of injecting more CSS rules (some of which
    // could be useless).
    rules.forEach((rule) => {
      if (!this.injectedRules.has(rule)) {
        // Check if the selector would match
        try {
          if (!this.window.document.querySelector(rule)) {
            return;
          }
        } catch (e) {  // invalid selector
          return;
        }

        this.injectedRules.add(rule);
        rulesToInject.push(` :root ${rule}`);
      }
    });

    // Inject selected rules
    if (rulesToInject.length > 0) {
      injectCSSRule(`${rulesToInject.join(' ,')} {display:none !important;}`, this.window.document);
    }
  }

  handleResponseFromBackground({ active, scripts, blockedScripts, styles }) {
    if (!active) {
      this.unload();
      return;
    }

    // Inject scripts
    scripts.forEach((script) => {
      injectScript(script, this.window.document);
    });

    // Block scripts
    blockedScripts.forEach((script) => {
      blockScript(script, this.window.document);
    });

    this.handleRules(styles);
  }
}
