import { registerContentScript } from '../core/content/helpers';

function searchbox(doc) {
  return doc.getElementById('searchbox');
}

const expectedSERPS = [
  'www.google.', 'google.',
  'www.duckduckgo.', 'duckduckgo.',
  'www.startpage.', 'startpage.',
  'www.bing.', 'bing.',
  'de.yahoo.', 'yahoo.',
  'www.ecosia.', 'ecosia.',
  'www.qwant.', 'qwant.'
];

function isSearchEngine(host, path) {
  const hasNoPath = !path || (path.length === 1 && path[0] === '/');

  return hasNoPath && expectedSERPS.some(x => host.indexOf(x) === 0);
}

function serpTelemetry(win, sendTelemetry) {
  win.document.addEventListener('click', (ev) => {
    const target = ev.target;
    const telemetry = target.dataset.telemetry;
    const result = target.closest('.result');
    let resultTitle;

    if (telemetry) {
      let element = '';
      switch (telemetry) {
        // Send whenever a user clicks on a result
        case 'result':
          resultTitle = result.querySelector('.searchbox-results-item-title');
          sendTelemetry({
            source: 'm',
            index: result.dataset.idx,
            queryLength: searchbox(win.document).value.length,
            element: target.dataset.telemetryElement,
            isSearchEngine: resultTitle && isSearchEngine(
              resultTitle.host,
              resultTitle.pathname
            ),
            session: result.dataset.session,
          }, 'metrics.experiments.serp.click.result');
          break;
        // Send whenever a user clicks on a query suggestion
        case 'suggestion':
          sendTelemetry({
            source: 'Z',
            index: target.closest('.suggestion').dataset.idx,
            queryLength: searchbox(win.document).value.length,
            session: target.closest('.suggestion').dataset.session,
          }, 'metrics.experiments.serp.click.result');
          break;
        case 'search':
          sendTelemetry({
            index: target.closest('.suggestion').dataset.idx,
            queryLength: searchbox(win.document).value.length,
          }, 'metrics.experiments.serp.click.search');
          break;
        /* Send whenever a user clicks on the magnifying glass
         * to search (on Cliqz) or on an alternative search link
         */
        case 'search-engine':
          // it is target in the case of the magnifying glass
          element = target.closest('.searchbox-categories-option') || target;
          sendTelemetry({
            engine: element.dataset.engine,
            category: element.dataset.category || null,
            view: element.dataset.view,
            session: element.dataset.session,
          }, 'metrics.experiments.serp.click.search');
          break;
        default:
          break;
      }
    }
  });

  win.addEventListener('message', (ev) => {
    const data = ev.data;
    if (!data) {
      return;
    }

    if (data.message === 'results' || data.message === 'landing') {
      // Send whenever the SERP page is shown
      sendTelemetry({
        queryLength: data.payload.queryLength,
        resultCount: data.payload.resultCount,
        suggestionCount: data.payload.suggestionCount,
        view: data.message,
        session: data.payload.session,
      }, 'metrics.experiments.serp.show');
    } else if (data.message === 'serp:character-typed') {
      // Send whenever a user types something on the SERP (i.e. for each character typed)
      sendTelemetry({
        queryLength: data.payload.queryLength,
        hasSuggestions: data.payload.hasSuggestions,
        session: data.payload.session,
      }, 'metrics.experiments.serp.type');
    }
  });

  win.document.addEventListener('keydown', (ev) => {
    const ENTER = 13;
    if (ev.keyCode !== ENTER) {
      return;
    }

    if (ev.target !== searchbox(win.document)) {
      return;
    }

    const dataTarget = ev.target.parentNode;
    if (!dataTarget) {
      return;
    }

    // send whenever a user hits enter to search (on Cliqz)
    sendTelemetry({
      view: dataTarget.dataset.view,
      session: dataTarget.dataset.session,
    }, 'metrics.experiments.serp.enter.search');
  });
}

function registerScript(window, CLIQZ) {
  function sendTelemetry(signal, schema) {
    CLIQZ.app.modules.core.action('sendTelemetry', signal, false, schema);
  }
  if (window.document && window.document.readyState === 'complete') {
    serpTelemetry(window, sendTelemetry);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      serpTelemetry(window, sendTelemetry);
    });
  }
}

registerContentScript('core-cliqz', 'https://suchen.cliqz.com/', (window, _, CLIQZ) => {
  registerScript(window, CLIQZ);
});
registerContentScript('core-cliqz', 'https://s3.amazonaws.com/cdncliqz/update/edge/serp/master/*', (window, _, CLIQZ) => {
  registerScript(window, CLIQZ);
});
