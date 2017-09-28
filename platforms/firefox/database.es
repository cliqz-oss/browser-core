/* global PouchDB */
import environment from "platform/environment";
import console from "platform/console";
import window from "platform/window-api";

Cu.importGlobalProperties(['indexedDB', 'XMLHttpRequest']);

// https://loune.net/2015/02/pouchdb-for-firefox-addon-sdk/
const global = {
  indexedDB,
  get IDBKeyRange() {
    if (typeof IDBKeyRange !== 'undefined') {
      return IDBKeyRange;
    } else {
      // in FF 57 IDBKeyRange is undefined in the bootstrapped context
      // we should use a getter as the window() might not be initialized
      // early in the browser startup process
      return window().IDBKeyRange;
    }
  },
  btoa,        //global anyway, exporting to be sure
  atob,        //global anyway, exporting to be sure
  escape,      //global anyway, exporting to be sure
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

const pouchUrl = "chrome://cliqz/content/bower_components/pouchdb/dist/pouchdb.js";

Services.scriptloader.loadSubScriptWithOptions(pouchUrl, {
  target: global
});

export default global.global.PouchDB;
