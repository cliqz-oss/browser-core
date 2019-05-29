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

  clearSelection() {
    [...this.rootElement.querySelectorAll('a')].forEach(
      anchor => anchor.classList.remove('selected')
    );
  }

  getResultElement(result) {
    if (!result) {
      return null;
    }
    return [...this.rootElement.querySelectorAll('a')].find(a => a.dataset.url === result.url) || null;
  }

  selectResult(result) {
    const el = this.getResultElement(result);
    if (el) {
      el.classList.add('selected');
    }
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
    this.clearSelection();
    this.selectResult(this.selectedResult);
    this.actions.reportHighlight(this.selectedResult.serialize());
    return this.selectedResult;
  }

  clear() {
    this.dropdownElement.innerHTML = '';
  }

  renderResults(results, { urlbarAttributes, extensionId, channelId, isRerendering } = {}) {
    this.selectedIndex = 0;
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
      this.selectResult(this.results.firstResult);
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

    // In web-ext clicking on result doesn't focus on iframe,
    // hence we don't give focus back to urlbar
    // window.focus();
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

    // TODO: merge with onMouseUp handler
    const resultElement = targetElement.closest('.result');

    if (!resultElement) {
      this.clearSelection();
      this.selectedIndex = 0;
      return;
    }

    if (resultElement.classList.contains('non-selectable')) {
      return;
    }

    const href = resultElement.dataset.url;
    const resultIndex = this.results.selectableResults.findIndex(r => r.url === href);

    this.clearSelection();

    if (resultIndex !== -1) {
      this.selectedIndex = resultIndex;
      this.updateSelection();
    }
  };
}
