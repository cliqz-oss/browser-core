import PairingObserver from './pairing-observer';
import getBookmarks from '../../platform/pairing/bookmarks';
import { randomInt } from '../../core/crypto/random';
import console from '../../core/console';

export default class BookmarksImport extends PairingObserver {
  constructor(changeCallback) {
    super(changeCallback);
    this.requests = new Map();
  }

  onmessage(msg, source) {
    if (msg.type === 'pull') {
      getBookmarks().then((data) => {
        const { id, limit } = msg;
        const n = data.length;
        const pages = Math.ceil(n / limit);
        for (let page = 0; page < pages; page += 1) {
          this.comm.send({
            id,
            type: 'push',
            data: data.slice(page * limit, (page + 1) * limit),
            pages,
            page
          }, source);
        }
      }).catch((e) => {
        console.error('[bookmarks-import]', e);
      });
    } else if (msg.type === 'push') {
      if (this.requests.has(msg.id)) {
        const cb = this.requests.get(msg.id);
        cb(msg);
      }
    } else {
      throw new Error(`Unknown cmd ${msg.type}`);
    }
  }

  pull(target, ondata, limit = 1000) {
    return new Promise((resolve, reject) => {
      const id = randomInt();
      const pages = new Set();
      let numBookmarks = 0;

      const error = (e) => {
        this.requests.delete(id);
        reject(e);
      };

      let timeout;
      function resetTimeout() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          error(new Error('Bookmark pull timed out'));
        }, 5000);
      }
      resetTimeout();

      this.requests.set(id, (msg) => {
        if (!pages.has(msg.page)) {
          numBookmarks += msg.data.length;
          resetTimeout();
          pages.add(msg.page);
          ondata(msg.data);
          if (pages.size >= msg.pages) {
            resolve({ numBookmarks });
          }
        }
      });

      this.comm.send({ id, type: 'pull', limit }, target).catch(error);
    });
  }
}
