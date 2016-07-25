/* global PouchDB */
import { utils } from "core/cliqz";

Cu.importGlobalProperties(['indexedDB', 'XMLHttpRequest']);
//Components.utils.import("resource://gre/modules/devtools/Console.jsm");

// https://loune.net/2015/02/pouchdb-for-firefox-addon-sdk/
const global = {
  indexedDB,
  IDBKeyRange, //global anyway, exporting to be sure
  btoa,        //global anyway, exporting to be sure
  atob,        //global anyway, exporting to be sure
  escape,      //global anyway, exporting to be sure
  XMLHttpRequest,
  clearTimeout: utils.clearTimeout,
  setTimeout: utils.setTimeout,
  console: {
    log: function () {
      utils.log(JSON.stringify(arguments), "PouchDB global")
    },
    error: function () {
      utils.log(JSON.stringify(arguments), "PouchDB global error")
    }
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
