Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

var dbConn;

export default function getDbConn (databaseName) {
  if (!dbConn) {
    dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", [databaseName]));
  }
  return dbConn;
}
