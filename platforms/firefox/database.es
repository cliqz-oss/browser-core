import environment from './environment';
import console from './console';
import getWindowAPIAsync from './window-api';
import { Services } from '../platform/globals';

let windowAPI = {
  IDBKeyRange: null
};

// https://loune.net/2015/02/pouchdb-for-firefox-addon-sdk/
const global = {
  indexedDB,
  get IDBKeyRange() {
    if (typeof IDBKeyRange !== 'undefined') {
      return IDBKeyRange;
    }
    // in FF 57 IDBKeyRange is undefined in the bootstrapped context
    // we should use a getter as the window() might not be initialized
    // early in the browser startup process
    return windowAPI.IDBKeyRange;
  },
  btoa, // global anyway, exporting to be sure
  atob, // global anyway, exporting to be sure
  escape, // global anyway, exporting to be sure
  XMLHttpRequest,
  clearTimeout: environment.clearTimeout,
  setTimeout: environment.setTimeout,
  console: {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: (console.warn || console.error).bind(console),
    info: (console.info || console.log).bind(console),
  },
  global: {
    // placeholder for PouchDB object
  },
};

let pouchPromise;
const PROXY_WHITELIST = [
  'put',
  'post',
  'get',
  'remove',
  'bulkDocs',
  'allDocs',
  'putAttachment',
  'getAttachment',
  'removeAttachment',
  'createIndex',
  'find',
  'explain',
  'getIndexes',
  'deleteIndex',
  'findIndexes',
  'query',
  'viewCleanup',
  'info',
  'compact',
  'revsDiff',
  'bulkGet',
  'close',
  'destroy',
];

export default function Database(...props) {
  if (!pouchPromise) {
    pouchPromise = getWindowAPIAsync().then((wAPI) => {
      windowAPI = wAPI;

      const pouchUrl = 'chrome://cliqz/content/vendor/pouchdb.js';
      Services.scriptloader.loadSubScriptWithOptions(pouchUrl, {
        target: global
      });

      return global.global.PouchDB;
    });
  }

  let pouch;
  const pouchInstance = pouchPromise.then((Pouch) => {
    pouch = new Pouch(...props);
  });

  const pouchProxy = new Proxy({}, {
    get(target, name) {
      if (PROXY_WHITELIST.indexOf(name) !== -1) {
        return (...args) => pouchInstance.then(() => pouch[name](...args));
      }
      return (pouch || target)[name];
    }
  });

  return pouchProxy;
}
