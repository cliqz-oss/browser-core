/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import templates from './templates';
import { parse } from '../core/url';

const getEventTarget = (ev) => {
  let targetElement = ev.originalTarget || ev.target;

  if (targetElement.nodeType !== 1) {
    targetElement = targetElement.parentElement;
  }

  return targetElement;
};

export default class Dropdown {
  constructor(element, window, actions) {
    this.rootElement = element;
    this.window = window;
    this.actions = actions;
    this.currentQueryId = 0;
  }

  init() {
    this.styleElement = document.createElement('style');
    this.rootElement.innerHTML = templates.main();
    this.dropdownElement.addEventListener('click', this.onClick);
    this.dropdownElement.addEventListener('auxclick', this.onClick);
    this.dropdownElement.addEventListener('mousemove', this.onMouseMove, { passive: true });
    document.head.appendChild(this.styleElement);
  }

  get dropdownElement() {
    return this.rootElement.querySelector('#cliqz-dropdown');
  }

  get selectedResult() {
    return this.results.get(this.selectedIndex);
  }

  nextResult() {
    if (this.selectedIndex === (this.results.length - 1)) {
      this.selectedIndex = 0;
    } else {
      this.selectedIndex += 1;
    }
    this.scrollToCurrentResult();
    return this.updateSelection();
  }

  previousResult() {
    if (this.selectedIndex <= 0) {
      this.selectedIndex = this.results.length - 1;
    } else {
      this.selectedIndex -= 1;
    }
    this.scrollToCurrentResult();
    return this.updateSelection();
  }

  clearResultClass(className) {
    [...this.rootElement.querySelectorAll('a')].forEach(
      anchor => anchor.classList.remove(className)
    );
  }

  setResultElementClass(el, className) {
    this.clearResultClass(className);
    el.classList.add(className);
  }

  getResultElementByIndex(index) {
    const result = this.results.get(index);

    const resultNodes = [...this.rootElement.querySelectorAll('.result')]
      .filter(a => a.dataset.url === result.url);

    let n = -1;
    this.results.selectableResults.find((r) => {
      if (r.url === result.url) {
        n += 1;
      }
      return r === result;
    });

    return resultNodes[n];
  }

  selectCurrentResult() {
    const el = this.getResultElementByIndex(this.selectedIndex);
    this.setResultElementClass(el, 'selected');
  }

  highlightResult(el) {
    this.setResultElementClass(el, 'hovered');
  }

  scrollToCurrentResult() {
    const el = this.getResultElementByIndex(this.selectedIndex);
    if (el) {
      const wHeight = this.window.innerHeight;
      const dHeight = this.rootElement.scrollHeight;
      if (wHeight !== dHeight) {
        const scrollTop = this.window.pageYOffset;
        const scrollBottom = scrollTop + wHeight;
        const elTop = el.offsetTop;
        const elBottom = el.offsetTop + el.scrollHeight;
        if (scrollTop > elTop) {
          this.window.scrollTo(0, elTop);
        }
        if (scrollBottom < elBottom) {
          this.window.scrollTo(0, elBottom - wHeight);
        }
      }
    }
  }

  updateUrlbarAttributes(attrs) {
    if ('modifier' in attrs) {
      document.body.classList[attrs.modifier ? 'add' : 'remove']('modifier');
    }

    if ('padding' in attrs) {
      this.dropdownElement.style.setProperty('--content-padding-start', `${attrs.padding}px`);
    }

    if ('navbarColor' in attrs) {
      this.styleElement.textContent = attrs.navbarColor
        ? `.history { background-color: ${attrs.navbarColor}!important }`
        : '';
    }
  }

  updateSelection() {
    this.selectCurrentResult();
    this.actions.reportHighlight(this.selectedResult.serialize());
    return this.selectedResult;
  }

  clear() {
    this.selectedIndex = 0;
  }

  getSelectedResultIndex(newResults, queryId) {
    if (this.selectedIndex > 0
      && this.currentQueryId === queryId
      && this.results && newResults
      && this.selectedResult
    ) {
      const keepResult = newResults.findSelectable(this.selectedResult.url);
      if (keepResult) {
        return newResults.indexOf(keepResult);
      }
    }

    return 0;
  }

  renderResults(results, {
    extensionId,
    channelId,
    queryId,
    isRerendering,
  } = {}) {
    this.selectedIndex = this.getSelectedResultIndex(results, queryId);
    this.currentQueryId = queryId;
    this.results = results;

    if (extensionId) {
      this.dropdownElement.dataset.extensionId = extensionId;
    }

    if (channelId) {
      this.dropdownElement.dataset.channelId = channelId;
    }

    // Render and insert templates
    const html = templates.results({
      historyResults: results.historyResults,
      genericResults: results.genericResults,
    }, {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true,
    });
    this.dropdownElement.innerHTML = html;

    // Nofify results that have been rendered
    results.results.forEach((result) => {
      if (!result.didRender) {
        return;
      }
      result.didRender(this.dropdownElement);
    });

    [...this.rootElement.querySelectorAll('a')].forEach((anchor) => {
      anchor.addEventListener('mousedown', ev => ev.preventDefault());
      anchor.addEventListener('click', ev => ev.preventDefault());
    });

    if (!isRerendering) {
      this.selectCurrentResult();
    }

    const historyResults = this.rootElement.querySelectorAll('.history');
    if (historyResults.length > 0) {
      historyResults[historyResults.length - 1].classList.add('last');
    }
  }

  onClick = (ev) => {
    // We use the same listener for events 'click' for handling left clicks
    // and 'auxclick' for handlings middle clicks.
    // Make sure we don't handle same event twice.
    if ((ev.type === 'click' && ev.button !== 0)
      || (ev.type === 'auxclick' && ev.button !== 1)) {
      return;
    }

    const targetElement = getEventTarget(ev);
    const resultElement = targetElement.closest('.result');

    if (!resultElement) {
      return;
    }

    const href = resultElement.dataset.url;
    const result = this.results.find(href);

    if (!result) {
      return;
    }

    // We cannot prevent Firefox from opening a new page on middle click
    // (see https://bugzilla.mozilla.org/show_bug.cgi?id=1374096 for details).
    // So we let browser do it, while setting `handledByBrowser` flag,
    // in order to skip handling middleclick ourselves, but still report telemetry.
    const handledByBrowser = ev.type === 'auxclick'
      && ev.button === 1
      && resultElement.hasAttribute('href')
      // Firefox won't open "about:" page from webextension page
      && parse(href)
      && parse(href).scheme !== 'about';

    const elementName = targetElement.getAttribute('data-extra');
    result.click(href, ev, { elementName, handledByBrowser });
  };

  onMouseMove = (ev) => {
    const targetElement = getEventTarget(ev);
    if (this.lastTarget === targetElement) {
      return;
    }
    this.lastTarget = targetElement;

    const now = Date.now();
    if ((now - this.lastMouseMove) < 10) {
      return;
    }
    this.lastMouseMove = now;

    const resultElement = targetElement.closest('.result');
    if (!resultElement || resultElement.classList.contains('non-selectable')) {
      return;
    }

    const href = resultElement.dataset.url;
    const resultIndex = this.results.selectableResults.findIndex(r => r.url === href);
    const result = this.results.get(resultIndex);
    if (this.lastHoveredResult === result || resultIndex === -1) {
      return;
    }

    this.lastHoveredResult = result;
    this.highlightResult(resultElement);
    this.actions.reportHover(result.serialize());
  };
}
