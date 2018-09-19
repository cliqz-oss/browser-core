import templates from './templates';
import { equals, isCliqzAction } from '../core/content/url';

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
    this.dropdownElement.addEventListener('click', this.onMouseUp);
    this.dropdownElement.addEventListener('mouseup', this.onMouseUp);
    this.dropdownElement.addEventListener('contextmenu', this.onMouseUp);
    this.dropdownElement.addEventListener('mousemove', this.onMouseMove);
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

    return this.updateSelection();
  }

  previousResult() {
    if (this.selectedIndex <= 0) {
      this.selectedIndex = this.results.length - 1;
    } else {
      this.selectedIndex -= 1;
    }

    return this.updateSelection();
  }

  clearSelection() {
    [...this.rootElement.querySelectorAll('a')].forEach(
      anchor => anchor.classList.remove('selected')
    );
  }

  selectResult(result) {
    if (!result) {
      return;
    }
    const el = [...this.rootElement.querySelectorAll('a')].find(a => equals(a.dataset.url, result.url));
    if (!el) {
      return;
    }
    el.classList.add('selected');
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

  renderResults(results, { urlbarAttributes, extensionId, channelId } = {}) {
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

      const urlbarBottomLine = this.window.document.createElement('div');
      urlbarBottomLine.setAttribute('class', 'urlbar-bottom-line');
      urlbarBottomLine.style.left = `${urlbarAttributes.left}px`;
      urlbarBottomLine.style.width = `${urlbarAttributes.width}px`;

      this.dropdownElement.prepend(urlbarBottomLine);
    }

    // Nofify results that have been rendered
    results.results.forEach((result) => {
      if (!result.didRender) {
        return;
      }
      result.didRender(this.dropdownElement);
    });

    [...this.rootElement.querySelectorAll('a')].forEach((anchor) => {
      anchor.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        return false;
      });
      anchor.addEventListener('click', (ev) => {
        ev.preventDefault();
        return false;
      });
    });

    this.selectResult(this.results.firstResult);

    const historyResults = this.rootElement.querySelectorAll('.history');
    if (historyResults.length > 0) {
      historyResults[historyResults.length - 1].classList.add('last');
    }
  }

  onMouseUp = (ev) => {
    // In order to capture middle mouse event, we need 'mouseup'
    // But we don't want to have 2 different events (mouseup & click)
    // fired for leftClick or rightClick, we need to filter them out
    if (ev.type === 'mouseup' && ev.button !== 1) {
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

    if (ev.button === 2) {
      const subresult = isCliqzAction(href) ? result : result.findResultByUrl(href);

      this.actions.openContextMenu(subresult.serialize(), { x: ev.screenX, y: ev.screenY });
    } else {
      const elementName = targetElement.getAttribute('data-extra');
      result.click(href, ev, { elementName });
      // In web-ext clicking on result doesn't focus on iframe,
      // hence we don't give focus back to urlbar
      window.focus();
    }
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
    const resultIndex = this.results.selectableResults.findIndex(r => equals(r.url, href));

    this.clearSelection();

    if (resultIndex !== -1) {
      this.selectedIndex = resultIndex;
      this.updateSelection();
    }
  };
}
