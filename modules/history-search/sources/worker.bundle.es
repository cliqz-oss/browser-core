/* eslint-disable camelcase */
import {
  init,
  search,
  update_history_item,
  add_history_item,
  remove_history_item,
} from './wasm';

const onmessage = (event) => {
  const message = event.data;
  switch (message.action) {
    case 'addHistoryItems': {
      const dataToAdd = message.data;
      dataToAdd.forEach(visit =>
        add_history_item(
          visit.title,
          visit.url,
          visit.visitCount,
          `${visit.lastVisitTime}`,
          visit.isBookmarked,
          visit.typedCount || 0,
        ));
      break;
    }

    case 'updateHistoryItem': {
      const visit = message.data;
      update_history_item(
        visit.title,
        visit.url,
        visit.visitCount,
        `${visit.lastVisitTime}`,
        false, // isBookmarked
        visit.typedCount || 0,
      );
      break;
    }

    case 'removeHistoryItems': {
      const urls = message.data;
      urls.forEach(url => remove_history_item(url));
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
