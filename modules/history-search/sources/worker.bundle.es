/* eslint-disable camelcase */
import { init, search, update_history_item, add_history_item } from './wasm';

const onmessage = (event) => {
  const message = event.data;
  switch (message.action) {
    case 'addHistoryItems': {
      const dataToAdd = message.data;
      dataToAdd.forEach(visit =>
        add_history_item(visit.title, visit.url, visit.visitCount, `${visit.lastVisitTime}`));
      break;
    }

    case 'updateHistoryItem': {
      const visit = message.data;
      update_history_item(visit.title, visit.url, visit.visitCount, `${visit.lastVisitTime}`);
      break;
    }

    case 'searchFromHistory': {
      const query = message.data.query;
      const count = message.data.count;
      const rawResults = search(query, count, Date.now());

      self.postMessage({
        type: 'response',
        uuid: message.uuid,
        response: {
          rawResults,
        },
      });
      break;
    }

    default:
  }
};

async function onload() {
  await init();
  self.onmessage = onmessage;
  self.postMessage({
    action: 'notifyWasmLoaded',
    args: [],
  });
}

onload();
