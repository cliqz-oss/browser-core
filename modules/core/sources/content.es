/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { isTopWindow } from './content/helpers';
import { registerContentScript } from './content/register';

function getContextHTML(ev) {
  let target = ev.target;
  let html;

  try {
    for (let count = 0; count < 5; count += 1) {
      html = target.innerHTML;

      if (html.indexOf('http://') !== -1 || html.indexOf('https://') !== -1) {
        return html;
      }

      target = target.parentNode;

      count += 1;
    }
  } catch (ee) {
    // Ignore error
  }

  return undefined;
}

function recordMouseDown(ev, CLIQZ) {
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
        href: ev.target.parentNode ? ev.target.parentNode.href : null,
      },
      linksSrc,
    },
  };

  CLIQZ.app.modules.core.action('recordMouseDown', event, getContextHTML(ev), href);
}

function recordMeta(window, CLIQZ) {
  // don't analyse language for (i)frames
  if (!isTopWindow(window)) {
    return;
  }

  // ReportLang
  const lang = window.document
    .getElementsByTagName('html')
    .item(0)
    .getAttribute('lang');

  const title = window.document.querySelector('title');
  const description = window.document.querySelector('meta[name=description]');
  const ogTitle = window.document.querySelector('meta[property="og:title"]');
  const ogDescription = window.document.querySelector('meta[property="og:description"]');
  const ogImage = window.document.querySelector('meta[property="og:image"]');

  CLIQZ.app.modules.core.action('recordMeta', window.location.href, {
    title: title && title.innerHTML,
    description: description && description.content,
    ogTitle: ogTitle && ogTitle.content,
    ogDescription: ogDescription && ogDescription.content,
    ogImage: ogImage && ogImage.content,
    lang,
  });
}

function getHTML() {
  return window.document.documentElement.outerHTML;
}

function click(selector) {
  const el = window.document.querySelector(selector);
  try {
    el.click();
    return true;
  } catch (e) {
    return false;
  }
}

function queryHTML(
  selector,
  attribute,
  { shadowRootSelector = null, attributeType = 'property' } = {},
) {
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

  return Array.prototype.map.call(root.querySelectorAll(selector), (el) => {
    if (attributes.length > 1) {
      return attributes.reduce(
        (hash, attr) => ({
          ...hash,
          [attr]: getAttr(el, attr),
        }),
        {},
      );
    }
    return getAttr(el, attribute);
  });
}

function queryComputedStyle(selector) {
  const root = window.document;
  return Array.prototype.map.call(
    root.querySelectorAll(selector), el => window.getComputedStyle(el)
  );
}

registerContentScript({
  module: 'core',
  matches: ['<all_urls>'],
  allFrames: true,
  matchAboutBlank: true,
  js: [
    (window, chrome, CLIQZ) => {
      const onMouseDown = (ev) => {
        recordMouseDown(ev, CLIQZ);
      };
      window.addEventListener('mousedown', onMouseDown);

      const onDOMContentLoaded = () => {
        recordMeta(window, CLIQZ);
      };
      window.addEventListener('DOMContentLoaded', onDOMContentLoaded);

      // Stop listening
      window.addEventListener('unload', () => {
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('DOMContentLoaded', onDOMContentLoaded);
      }, { once: true });

      // Expose content actions
      return {
        getHTML,
        click,
        queryHTML,
        queryComputedStyle,
      };
    }
  ],
});
