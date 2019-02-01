/* globals ExtensionAPI */
Components.utils.importGlobalProperties([
  'indexedDB'
]);

function exportDexieTable(dbName, version, table) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version * 10);
    request.onerror = () => {
      reject(new Error('Could not open DB'));
    };
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([table]);
      const query = transaction.objectStore(table).getAll();
      query.onsuccess = (results) => {
        console.log('[cliqz-data-migration]', dbName, table, results.target.result);
        resolve(results.target.result);
      };
    };
  });
}

function deleteDatabase(name) {
  return indexedDB.deleteDatabase(name);
}

global.cliqzdbmigration = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqzdbmigration: {
        exportDexieTable,
        deleteDatabase,
      }
    };
  }
};
