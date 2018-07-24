import { registerContentScript, CHROME_MSG_SOURCE } from '../core/content/helpers';

function sendTelemetry(signal, schema, windowId) {
  chrome.runtime.sendMessage({
    source: CHROME_MSG_SOURCE,
    windowId,
    payload: {
      module: 'core',
      action: 'sendTelemetry',
      args: [signal, false, schema],
    },
  });
}

function searchbox(doc) {
  return doc.getElementById('searchbox');
}

function serpTelemetry(win, windowId) {
  win.document.addEventListener('click', (ev) => {
    const target = ev.target;
    const telemetry = target.dataset.telemetry;
    if (telemetry) {
      switch (telemetry) {
        case 'result':
          sendTelemetry({
            source: 'm',
            index: target.closest('.result').dataset.idx,
            queryLength: searchbox(win.document).value.length,
            element: target.dataset.telemetryElement,
          }, 'metrics.experiments.serp.click.result', windowId);
          break;
        case 'suggestion':
          sendTelemetry({
            source: 'Z',
            index: target.closest('.suggestion').dataset.idx,
            queryLength: searchbox(win.document).value.length,
          }, 'metrics.experiments.serp.click.result', windowId);
          break;
        case 'search':
          sendTelemetry({
            index: target.closest('.suggestion').dataset.idx,
            queryLength: searchbox(win.document).value.length,
          }, 'metrics.experiments.serp.click.search', windowId);
          break;
        default:
          break;
      }
    }
  });

  window.addEventListener('message', (ev) => {
    const data = ev.data;
    if (data && data.message === 'results') {
      sendTelemetry({
        queryLength: data.payload.queryLength,
        resultCount: data.payload.resultCount,
        suggestionCount: data.payload.suggestionCount,
      }, 'metrics.experiments.serp.show', windowId);
    }
  });
}

function afterWindowLoad(window, callback, windowId) {
  if (window.document && window.document.readyState === 'complete') {
    callback(window, windowId);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      callback(window, windowId);
    });
  }
}


registerContentScript('https://suche.cliqz.com*', (window, _, windowId) => {
  afterWindowLoad(window, serpTelemetry, windowId);
});

registerContentScript('https://search.cliqz.com*', (window, _, windowId) => {
  afterWindowLoad(window, serpTelemetry, windowId);
});
