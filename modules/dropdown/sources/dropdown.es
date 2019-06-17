import templates from './templates';
import { URLInfo } from '../core/url-info';

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
    this.currentQuery = null;
  }

  init() {
    this.rootElement.innerHTML = templates.main();
    this.dropdownElement.addEventListener('click', this.onClick);
    this.dropdownElement.addEventListener('auxclick', this.onClick);
    this.dropdownElement.addEventListener('mousemove', this.onMouseMove, { passive: true });
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
    this.scrollToResult(this.selectedResult);

    return this.updateSelection();
  }

  previousResult() {
    if (this.selectedIndex <= 0) {
      this.selectedIndex = this.results.length - 1;
    } else {
      this.selectedIndex -= 1;
    }
    this.scrollToResult(this.selectedResult);

    return this.updateSelection();
  }

  clearResultClass(className) {
    [...this.rootElement.querySelectorAll('a')].forEach(
      anchor => anchor.classList.remove(className)
    );
  }

  setResultClass(result, className) {
    this.clearResultClass(className);
    const el = this.getResultElement(result);
    if (el) {
      el.classList.add(className);
    }
  }

  getResultElement(result) {
    if (!result) {
      return null;
    }
    return [...this.rootElement.querySelectorAll('a')].find(a => a.dataset.url === result.url) || null;
  }

  selectResult(result) {
    this.setResultClass(result, 'selected');
  }

  highlightResult(result) {
    this.setResultClass(result, 'hovered');
  }

  scrollToResult(result) {
    const el = this.getResultElement(result);
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

  updateSelection() {
    this.selectResult(this.selectedResult);
    this.actions.reportHighlight(this.selectedResult.serialize());
    return this.selectedResult;
  }

  clear() {
    this.selectedIndex = 0;
    this.currentQuery = null;
  }

  getSelectedResultIndex(newResults, preventAutocomplete) {
    if (this.selectedIndex > 0
      && !preventAutocomplete
      && this.results && newResults
      && this.currentQuery === newResults.query
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
    urlbarAttributes,
    extensionId,
    channelId,
    preventAutocomplete,
    isRerendering,
  } = {}) {
    this.selectedIndex = this.getSelectedResultIndex(results, preventAutocomplete);
    this.currentQuery = results.query;
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
    });
    this.dropdownElement.innerHTML = html;

    if (urlbarAttributes) {
      this.dropdownElement.style.setProperty('--content-padding-start', `${urlbarAttributes.padding}px`);
    }

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
      this.selectResult(this.selectedResult);
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
      && URLInfo.get(href)
      && URLInfo.get(href).protocol !== 'about';

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
    this.highlightResult(result);
    this.actions.reportHover(result.serialize());
  };
}
