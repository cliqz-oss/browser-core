import { chrome } from '../globals';

export default class {
  static queryVisitsForTimespan({ frameStartsAt, frameEndsAt }) {
    return new Promise((resolve) => {
      chrome.history.search({
        text: '',
        startTime: frameStartsAt / 1000,
        endTime: frameEndsAt / 1000,
      }, (items) => {
        resolve(items.map(({ url, lastVisitTime }) => ({
          url,
          ts: lastVisitTime
        })));
      });
    });
  }
}
