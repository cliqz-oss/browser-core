import { Services } from '../globals';
import getWindowAPIAsync from '../window-api';

let Dexie;
let loadingPromise;

export default function () {
  if (Dexie) {
    return Promise.resolve(Dexie);
  }
  if (!loadingPromise) {
    loadingPromise = getWindowAPIAsync().then((wAPI) => {
      if (!global.IDBKeyRange) {
        global.IDBKeyRange = wAPI.IDBKeyRange;
      }
      const url = 'chrome://cliqz/content/vendor/dexie.min.js';
      const target = { global };
      Services.scriptloader.loadSubScriptWithOptions(url, { target });
      return target.Dexie;
    });
  }
  return loadingPromise;
}
