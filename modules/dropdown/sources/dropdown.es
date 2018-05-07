import templates from './templates';
import { equals, isCliqzAction } from '../core/content/url';

const getEventTarget = (ev) => {
  let targetElement = ev.originalTarget;

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
    this.actions.reportSelection(this.selectedResult.serialize());
    return this.selectedResult;
  }

  clear() {
    this.dropdownElement.innerHTML = '';
  }

  renderResults(results, { urlbarAttributes, extensionId } = {}) {
    this.selectedIndex = 0;
    this.results = results;

    if (extensionId) {
      this.dropdownElement.dataset.extensionId = extensionId;
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

    // prevent default behavior of anchor tags
    [...this.rootElement.querySelectorAll('a')].forEach((anchor) => {
      anchor.setAttribute('onclick', 'return false;');
      anchor.setAttribute('onmousedown', 'return false;');
    });

    this.selectResult(this.results.firstResult);

    const historyResults = this.rootElement.querySelectorAll('.history');
    if (historyResults.length > 0) {
      historyResults[historyResults.length - 1].classList.add('last');
    }
  }

  onMouseUp = (ev) => {
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
      result.click(href, ev);
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
