import { equals } from '../core/url';
import templates from './templates';
import { clickSignal } from './telemetry';

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
  }

  get dropdownElement() {
    return this.rootElement.querySelector('#cliqz-dropdown');
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
    const selectedResult = this.results.get(this.selectedIndex);
    this.selectResult(selectedResult);
    return selectedResult;
  }

  renderResults(results) {
    this.selectedIndex = 0;
    this.results = results;
    const html = templates.results({ results: results.results });
    this.dropdownElement.innerHTML = html;

    // prevent default behavior of anchor tags
    [...this.rootElement.querySelectorAll('a')].forEach((anchor) => {
      anchor.setAttribute('onclick', 'return false;');
      anchor.setAttribute('onmousedown', 'return false;');
    });

    this.rootElement.querySelector('a.result').classList.add('selected');

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

    result.click(this.window, href, ev);

    clickSignal({
      extra,
      coordinates,
      results: this.results,
      result,
      url: href,
      newTab: ev.ctrlKey || ev.metaKey,
    });
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
