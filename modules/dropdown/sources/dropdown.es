import { equals } from '../core/url';
import templates from './templates';
import { clickSignal } from './telemetry';
import ContextMenu from './context-menu';

export default class {
  constructor(element, window) {
    this.rootElement = element;
    this.window = window;
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
  }

  init() {
    this.rootElement.innerHTML = templates.main();
    this.dropdownElement.addEventListener('mouseup', this.onMouseUp);
    this.dropdownElement.addEventListener('mousemove', this.onMouseMove);
    this.contextMenu = new ContextMenu(this.window, this.dropdownElement);
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
    this.rootElement.querySelector(`a[href='${result.url}']`).classList.add('selected');
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
    const resultElem = this.rootElement.querySelector('.result');
    resultElem.classList.add('selected');

    const historyResults = this.rootElement.querySelectorAll('.history');
    if (historyResults.length > 0) {
      historyResults[historyResults.length - 1].classList.add('last');
    }
  }

  onMouseUp(ev) {
    const targetElement = ev.originalTarget;
    const resultElement = targetElement.closest('.result');
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

    if (ev.button === 2) {
      const subresult = result.findResultByUrl(href) || result;
      this.contextMenu.show(subresult, { x: ev.screenX, y: ev.screenY });
    } else {
      result.click(this.window, href, ev);

      if (!result.isCliqzAction) {
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
  }

  onMouseMove(ev) {
    const now = Date.now();
    if ((now - this.lastMouseMove) < 50) {
      return;
    }
    this.lastMouseMove = now;

    this.clearSelection();

    // TODO: merge with onMouseUp handler
    let resultElement;
    if (ev.originalTarget.classList.contains('result')) {
      resultElement = ev.originalTarget;
    } else {
      resultElement = ev.originalTarget.closest('.result');
    }

    if (!resultElement) {
      return;
    }

    const href = resultElement.href;
    const resultIndex = this.results.selectableResults.findIndex(r => equals(r.url, href));

    if (resultIndex !== -1) {
      this.selectedIndex = resultIndex;
      this.updateSelection();
    }
  }
}
