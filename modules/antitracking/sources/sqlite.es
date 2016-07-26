Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

var dbConn;

export default function getDbConn () {
  if (!dbConn) {
    dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbattrack"]));
  }
  return dbConn;
}
