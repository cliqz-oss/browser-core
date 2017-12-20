import { equals, isCliqzAction } from '../core/url';
import templates from './templates';
import { clickSignal } from './telemetry';
import ContextMenu from './context-menu';

export default class Dropdown {
  constructor(element, window, extensionID) {
    this.rootElement = element;
    this.window = window;
    this.extensionID = extensionID;
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
  }

  init() {
    this.rootElement.innerHTML = templates.main(this.extensionID);
    this.dropdownElement.addEventListener('mouseup', this.onMouseUp);
    this.dropdownElement.addEventListener('mousemove', this.onMouseMove);
    this.contextMenu = new ContextMenu(this.window, this.dropdownElement);
    this.dropdownElement.style.setProperty('--url-padding-start', '50px');
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
    const el = [...this.rootElement.querySelectorAll('a')].find(a => equals(a.href, result.url));
    if (!el) {
      return;
    }
    el.classList.add('selected');
  }

  updateSelection() {
    this.clearSelection();
    this.selectResult(this.selectedResult);
    return this.selectedResult;
  }

  renderResults(results) {
    this.selectedIndex = 0;
    this.results = results;

    // Render and insert templates
    const html = templates.results({ results: results.results });
    this.dropdownElement.innerHTML = html;
    this.dropdownElement.style.maxHeight = `${this.window.innerHeight - 140}px`;

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

  onMouseUp(ev) {
    let targetElement = ev.originalTarget;

    if (targetElement.nodeType !== 1) {
      targetElement = targetElement.parentElement;
    }

    const resultElement = targetElement.closest('.result');

    if (!resultElement) {
      return;
    }

    const extraElement = targetElement.closest('[data-extra]');
    const extra = extraElement ? extraElement.dataset.extra : null;
    const href = resultElement.href;
    const coordinates = [
      ev.offsetX,
      ev.offsetY,
      this.rootElement.clientWidth,
      this.rootElement.clientHeight,
    ];
    const result = this.results.find(href);
    if (!result) {
      return;
    }

    if (ev.button === 2) {
      const subresult = isCliqzAction(href) ? result : result.findResultByUrl(href);
      this.contextMenu.show(subresult, { x: ev.screenX, y: ev.screenY });
    } else {
      result.click(this.window, href, ev);

      clickSignal({
        extra,
        coordinates,
        results: this.results,
        result,
        url: href,
        newTab: ev.altKey || ev.metaKey || ev.ctrlKey,
      });
    }
  }

  onMouseMove(ev) {
    let targetElement = ev.originalTarget;

    if (targetElement.nodeType !== 1) {
      targetElement = targetElement.parentElement;
    }

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

    const href = resultElement.href;
    const resultIndex = this.results.selectableResults.findIndex(r => equals(r.url, href));

    if (resultIndex !== -1) {
      this.clearSelection();
      this.selectedIndex = resultIndex;
      this.updateSelection();
    } else {
      this.clearSelection();
    }
  }
}
