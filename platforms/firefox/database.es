/* global PouchDB */
import environment from "platform/environment";
import console from "platform/console";

Cu.importGlobalProperties(['indexedDB', 'XMLHttpRequest']);

// https://loune.net/2015/02/pouchdb-for-firefox-addon-sdk/
const global = {
  indexedDB,
  IDBKeyRange, //global anyway, exporting to be sure
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

export default function (dbName) {
  if (!global.global.PouchDB) {
    Services.scriptloader.loadSubScriptWithOptions(pouchUrl, {
      target: global
    });
  }
  return new global.global.PouchDB(dbName);
}
