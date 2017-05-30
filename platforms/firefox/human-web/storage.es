import md5 from "../../core/helpers/md5";
import { Components } from '../globals';

Components.utils.import('resource://gre/modules/FileUtils.jsm');

export default class {

  constructor(humanWeb) {
    this.humanWeb = humanWeb;
    this.dbConn = null;
  }

  init() {
    if ( FileUtils.getFile("ProfD", ["cliqz.dbusafe"]).exists() ) {
      if (this.olddbConn==null) {
        this.olddbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbusafe"]));
      }

      try{
        (this.olddbConn.executeSimpleSQLAsync || this.olddbConn.executeSimpleSQL)('DROP TABLE usafe;');
      } catch(ee){

      };
    }

    if ( FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]).exists() ) {
      if (this.dbConn==null) {
        this.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]))

      }
      this.createTable();
    } else {
      this.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]));
      this.createTable();
    }

    return this.dbConn;
  }

  // Ensuring the dbConn is not null.
  ensureConnection() {
    this.getDBConn();
  }

  getDBConn(){
    return this.dbConn || this.init();
  }

  addURLtoDB(url, ref, paylobj) {
    var tt = new Date().getTime();
    var se = this.humanWeb.checkSearchURL(url);
    if (se > -1 ){
      return
    }

    //Check if url is in hashtable
    var ft = 1;
    var privateHash = false;
    this.humanWeb.getPageFromHashTable(url, function(_res) {
      if (_res) {
        if(_res['private'] == 1 ){
          privateHash = true;
        }
        else{
          ft = 0;
        }
      }
      else{
        // we never seen it, let's add it
        paylobj['ft'] = true;
      }
    })

    // Need to add if canonical is seen before or not.
    // This is helpful, becuase now we replace the url with canonical incase of dropLongUrl(url) => true.
    // Hence, in the event log, lot of URL's look ft => true.

    if(paylobj['x'] && paylobj['x']['canonical_url'] && paylobj['x']['canonical_url'] != url){
      this.getCanUrlFromHashTable(paylobj['x']['canonical_url'], function(_res) {
        if (_res) {
          paylobj['csb'] = true;
        }
      })
    }


    var stmt = this.dbConn.createStatement("SELECT url, checked, ft, private, payload FROM usafe WHERE url = :url");
    stmt.params.url = url;

    var res = [];
    stmt.executeAsync({
      handleResult: (aResultSet) => {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          res.push({'url': row.getResultByName("url"), 'checked': row.getResultByName("checked"), 'ft' :row.getResultByName('ft'), 'private' :row.getResultByName('private'), 'payload' :row.getResultByName('payload') });
        }
      },
      handleError: (aError) => {
        this.humanWeb.log("SQL error: " + aError.message);
      },
      handleCompletion: (aReason) => {
        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
          this.humanWeb.log("SQL canceled or aborted");
        }
        else {
          if (res.length == 0 && !privateHash ){
            var setPrivate = false;
            var st = this.dbConn.createStatement("INSERT INTO usafe (url,ref,last_visit,first_visit, reason, private, checked,payload, ft) VALUES (:url, :ref, :last_visit, :first_visit, :reason, :private, :checked, :payload, :ft)");
            st.params.url = url;
            st.params.ref = ref;
            st.params.last_visit = tt;
            st.params.first_visit = tt;
            st.params.ft = ft;
            st.params.payload = JSON.stringify(paylobj || {});

            if (paylobj['x']==null) {
              // page data structure is empty, so no need to double fetch, is private
              st.params.checked = 1;
              st.params.private = 1;
              st.params.reason = 'empty page data';
              setPrivate = true;
              this.humanWeb.log("Setting private because empty page data");
            }
            else if (this.humanWeb.isSuspiciousURL(url)) {
              // if the url looks private already add it already as checked and private
              st.params.checked = 1;
              st.params.private = 1;
              st.params.reason = 'susp. url';
              setPrivate = true;
              this.humanWeb.log("Setting private because suspiciousURL");
            }
            else {
              if (this.humanWeb.httpCache401[url]) {
                st.params.checked = 1;
                st.params.private = 1;
                st.params.reason = '401';
                setPrivate = true;
                this.humanWeb.log("Setting private because of 401");
              }
              else {
                st.params.checked = 0;
                st.params.private = 0;
                st.params.reason = '';
                setPrivate = false;
              }
            }

            //while (st.executeStep()) {};
            st.executeAsync({
              handleError: (aError) => {
                this.humanWeb.log("SQL error: " + aError.message);
              },
              handleCompletion: (aReason) => {
                if(this.humanWeb.debug){
                  this.humanWeb.log("Insertion success add urltoDB");
                }
              }
            });

            if(setPrivate){
              this.humanWeb.setAsPrivate(url);
            }
          }
          else if(res.length > 0){
            if (res[0]['checked']==0) {
              //Need to aggregate the engagement metrics.
              var metricsBefore = JSON.parse(res[0]['payload'])['e'];
              var metricsAfter = paylobj['e'];
              paylobj['e'] = this.humanWeb.aggregateMetrics(metricsBefore, metricsAfter);

              //Since not checked it is still the ft.
              if(res[0]['ft']==1){
                paylobj['ft'] = true;
              }
              var st = this.dbConn.createStatement("UPDATE usafe SET last_visit = :last_visit, payload = :payload WHERE url = :url");
              st.params.url = url;
              st.params.last_visit = tt;
              st.params.payload = JSON.stringify(paylobj || {});
              //while (st.executeStep()) {};
              st.executeAsync({
                handleError: (aError) => {
                  this.humanWeb.log("SQL error: " + aError.message);
                },
                handleCompletion: (aReason) => {
                  if(this.humanWeb.debug){
                    this.humanWeb.log("Insertion success");
                  }
                }
              });
              paylobj['e'] = {'cp': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0};
            }
            else{
              if (res[0]['checked']==1 && res[0]['private'] == 0) {
                //Need to aggregate the engagement metrics.
                var metricsBefore = res[0]['payload']['e'];
                var metricsAfter = paylobj['e'];
                paylobj['e'] = this.humanWeb.aggregateMetrics(metricsBefore, metricsAfter);

                var st = this.dbConn.createStatement("UPDATE usafe SET last_visit = :last_visit, payload = :payload, checked = :checked WHERE url = :url");
                st.params.url = url;
                st.params.last_visit = tt;
                st.params.payload = JSON.stringify(paylobj || {});
                st.params.checked = 0;
                //while (st.executeStep()) {};
                st.executeAsync({
                  handleError: (aError) => {
                    this.humanWeb.log("SQL error: " + aError.message);
                  },
                  handleCompletion: (aReason) => {
                    if(this.humanWeb.debug){
                      this.humanWeb.log("Insertion success");
                    }
                  }
                });
                paylobj['e'] = {'cp': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0};
              }
            }
          }
        }
      }
    });
  }

  removeUnsafe(url) {
    var st = this.dbConn.createStatement("DELETE from usafe WHERE url = :url");
    st.params.url = url;
    //while (st.executeStep()) {};
    st.executeAsync({
      handleError: (aError) => {
        this.humanWeb.log("SQL error: " + aError.message);
      },
      handleCompletion: (aReason) => {
        if(this.humanWeb.debug){
          this.humanWeb.log("Delete success");
        }
      }
    });
  }

  listOfUnchecked(cap, sec_old, fixed_url, callback) {
    var tt = new Date().getTime();
    var stmt = null;
    if (fixed_url == null) {
      // all urls
      stmt = this.dbConn.createAsyncStatement("SELECT url, payload FROM usafe WHERE last_visit < :last_visit and private = :private and checked = :checked LIMIT :cap;");
    }
    else {
      stmt = this.dbConn.createAsyncStatement("SELECT url, payload FROM usafe WHERE last_visit < :last_visit and url = :url and private = :private and checked = :checked LIMIT :cap;");
      stmt.params.url = fixed_url;
    }
    stmt.params.last_visit = (tt - sec_old*1000);
    stmt.params.private = 0;
    stmt.params.cap = cap;
    stmt.params.checked = 0;

    var res = [];
    stmt.executeAsync({
      handleResult: (aResultSet) => {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          res.push([row.getResultByName("url"), JSON.parse(row.getResultByName("payload")) ]);
        }
      },
      handleError: (aError) => {
        this.humanWeb.log("SQL error: " + aError.message);
      },
      handleCompletion: (aReason) => {
        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
          this.humanWeb.log("SQL canceled or aborted");
        }
        else {
          if(res.length > 0){
            this.humanWeb.log("Got the result: " + res[0]);
          }
          callback(res.splice(0,cap), null);
        }
      }
    });
  }

  processUnchecks(listOfUncheckedUrls) {
    var url_pagedocPair = {};

    for(var i=0;i<listOfUncheckedUrls.length;i++) {
      var url = listOfUncheckedUrls[i][0];
      var page_doc = listOfUncheckedUrls[i][1];
      var page_struct_before = page_doc['x'];
      url_pagedocPair[url] = page_doc;

      this.isPrivate(url, 0,function(isPrivate) {
        if (isPrivate) {
          var st = this.dbConn.createStatement("UPDATE usafe SET reason = :reason, checked = :checked, private = :private , ft = :ft WHERE url = :url");
          st.params.url = url;
          st.params.checked = 1;
          st.params.private = 1;
          st.params.ft = 0;
          st.params.reason = 'priv. st.';
          //while (st.executeStep()) {};
          st.executeAsync({
            handleError: (aError) => {
              this.humanWeb.log("SQL error: " + aError.message);
            },
            handleCompletion: (aReason) => {
              if(this.humanWeb.debug){
                this.humanWeb.log("Insertion success private");
              }
            }
          });
          this.humanWeb.log("Marking as private via is private");
          this.humanWeb.setAsPrivate(url);
        }
        else {
          this.humanWeb.log("Going for double fetch: " + url);

          // only do doubleFetch for the same url 3 times in a row
          // (set up as this.humanWeb.MAX_NUMBER_DOUBLEFETCH_ATTEMPS).
          // If more attemps are tried then the url is marked as private.
          // Prevent infinite loop if the doubleFetch causes the browser
          // to crash (issue #2213)
          //
          this.loadRecord('last-double-fetch', function(data) {
            var obj = null;
            if (data==null) obj = {'url': url, 'count': 1};
            else {
              obj = JSON.parse(data);
              if (obj.url!=url) obj = {'url': url, 'count': 1};
              else {
                try {
                  obj['count'] += 1;
                } catch(err) {
                  obj['count'] = 1;
                }
              }
            }
            this.saveRecord('last-double-fetch', JSON.stringify(obj));

            if (obj.count > this.humanWeb.MAX_NUMBER_DOUBLEFETCH_ATTEMPS) {
              this.humanWeb.setAsPrivate(url);
            }
            else {
              this.humanWeb.doubleFetch(url, url_pagedocPair[url]);
            }
          });

        }
      });
    }
  }

  saveRecord(id, data) {
    if(!(this.dbConn)) return;
    var st = this.dbConn.createStatement("INSERT OR REPLACE INTO telemetry (id,data) VALUES (:id, :data)");
    st.params.id = id;
    st.params.data = data;

    st.executeAsync({
      handleError: (aError) => {
        if(this.humanWeb && this.humanWeb.debug){
          this.humanWeb.log("SQL error: " + aError.message);
        }
      },
      handleCompletion: (aReason) => {
        if(this.humanWeb && this.humanWeb.debug){
          this.humanWeb.log("Insertion success save record");
        }
      }
    });

  }

  loadRecord(id, callback) {
    var stmt = this.dbConn.createAsyncStatement("SELECT id, data FROM telemetry WHERE id = :id;");
    stmt.params.id = id;

    var fres = null;
    var res = [];
    stmt.executeAsync({
      handleResult: (aResultSet) => {
        if(!(this.humanWeb)) return;
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          if (row.getResultByName("id")==id) {
            res.push(row.getResultByName("data"));
          }
          else {
            this.humanWeb.log("There are more than one record");
            callback(null);
          }
          break;
        }
      },
      handleError: (aError) => {
        if(!(this.humanWeb)) return;
        this.humanWeb.log("SQL error: " + aError.message);
        callback(null);
      },
      handleCompletion: (aReason) => {
        if(!(this.humanWeb)) return;
        if (res.length == 1) callback(res[0]);
        else callback(null);
      }
    });
  }

  SQL(sql, onRow, callback, parameters) {
    // temporary fix to avoid console logs if human web is disabled
    // the history listner should be handled better if HW module is disabled
    if(!this.dbConn) return;

    var st = this.dbConn.createAsyncStatement(sql);

    for(var key in parameters) {
      st.params[key] = parameters[key];
    }

    this._SQL(this.dbConn, st, onRow, callback);
  }

  _SQL(dbConn, statement, onRow, callback) {
    statement.executeAsync({
      onRow: onRow,
      callback: callback,
      handleResult: (aResultSet) => {
        var resultCount = 0;
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          resultCount++;
          if (this.onRow) {
            this.onRow(statement.row);
          }
        }
        if (this.callback) {
          this.callback(resultCount);
        }
      },

      handleError: (aError) =>  {
        this.humanWeb.log("Error (" + aError.result + "):" + aError.message);
        if (this.callback) {
          this.callback(0);
        }
      },
      handleCompletion: (aReason) => {
        // Always called when done
      }
    });
    statement.finalize();
  }

  historyTimeFrame(callback) {
    // TODO:
    Cu.import('resource://gre/modules/PlacesUtils.jsm');
    var history = [];
    var min, max;

    var res = [];
    var st = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase)
      .DBConnection.createStatement("SELECT min(last_visit_date) as min_date, max(last_visit_date) as max_date FROM moz_places");

    var res = [];
    st.executeAsync({
      handleResult: function(aResultSet) {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          res.push({
            "minDate": row.getResultByName("min_date"),
            "maxDate": row.getResultByName("max_date")
          });
        }
      },
      handleError: function(aError) {
        _log("SQL error: " + aError.message);
        callback(true);
      },
      handleCompletion: function(aReason) {
        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
          _log("SQL canceled or aborted");
          callback(null);
        } else {
          try {
            min = parseInt(res[0]['minDate'] / 1000);
            max = parseInt(res[0]['maxDate'] / 1000);
          } catch (ex) {}
          callback(min, max);
        }
      }
    });
  }

  deleteVisit(url) {
    this.SQL("delete from usafe where url = :url", null, null, {
      url: this.escapeSQL(url)
    });
  }

  deleteTimeFrame() {
    this.humanWeb.historyTimeFrame(function(min, max) {
      this.SQL("delete from usafe where last_visit < :min", null, null, {
        min
      });
      this.SQL("delete from usafe where last_visit > :max", null, null, {
        max
      });
    });
  }

  clearHistory() {
    this.SQL("delete from usafe");
  }

  getCanUrlFromHashTable(canUrl, callback) {
    var res = [];
    var st = this.dbConn.createStatement("SELECT * FROM hashcans WHERE hash = :hash");
    st.params.hash = (md5(canUrl)).substring(0,16);
    st.executeAsync({
      handleResult: (aResultSet) => {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          res.push({"hash": row.getResultByName("hash")});
        }
      },
      handleError: (aError) => {
        this.humanWeb.log("SQL error: " + aError.message);
        callback(true);
      },
      handleCompletion: (aReason) => {
        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
          this.humanWeb.log("SQL canceled or aborted");
          callback(null);
        }
        else {
          if (res.length == 1) {
            callback(res[0]);
          }
          else {
            callback(null);
          }
        }
      }
    });
  }

  isPrivate(url, depth, callback) {
    // returns 1 is private (because of checked, of because the referrer is private)
    // returns 0 if public
    // returns -1 if not checked yet, handled as public in this cases,
    var res = [];
    var st = this.dbConn.createStatement("SELECT * FROM usafe WHERE url = :url");
    st.params.url = url;

    var res = [];
    st.executeAsync({
      handleResult: (aResultSet) => {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          res.push({"url": row.getResultByName("url"), "ref": row.getResultByName("ref"), "private": row.getResultByName("private"), "checked": row.getResultByName("checked")});
        }
      },
      handleError: (aError) => {
        this.humanWeb.log("SQL error: " + aError.message);
        callback(true);
      },
      handleCompletion: (aReason) => {
        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
          this.humanWeb.log("SQL canceled or aborted");
          callback(true);
        }
        else {
          if (res.length == 1) {
            if (res[0].ref!='' && res[0].ref!=null) {
              // the urls already exists in the DB, it has been seen before
              if (depth < 10) {
                if (this.humanWeb.auxSameDomain(res[0].ref, url)) {
                  this.isPrivate(res[0].ref, depth+1, function(priv) {
                    callback(priv);
                  });
                }
                else callback(false);
              }
              else {
                // set to private (becasue we are not sure so beter safe than sorry),
                // there is a loop of length > 10 between a <- b <- .... <- a, so if we do not
                // break recursion it will continue to do the SELECT forever
                //
                callback(true);
              }
            }
            else {
              callback(false);
            }
          }
          else {
            callback(true);
          }
        }
      }.bind(this)
    });
  }

  createTable(){
    var usafe = "create table if not exists usafe(\
                url VARCHAR(255) PRIMARY KEY NOT NULL,\
                ref VARCHAR(255),\
                last_visit INTEGER,\
                first_visit INTEGER,\
                reason VARCHAR(256), \
                private BOOLEAN DEFAULT 0,\
                checked BOOLEAN DEFAULT 0, \
                payload VARCHAR(4096), \
                ft BOOLEAN DEFAULT 1 \
            )";

    var hash_usafe = "create table if not exists hashusafe(\
                hash VARCHAR(32) PRIMARY KEY NOT NULL,\
                private BOOLEAN DEFAULT 0 \
            )";

    var hash_cans = "create table if not exists hashcans(\
                hash VARCHAR(32) PRIMARY KEY NOT NULL \
            )";

    var telemetry = "create table if not exists telemetry(\
                id VARCHAR(24) PRIMARY KEY NOT NULL,\
                data VARCHAR(1000000) \
            )";

    (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(usafe);
    (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(hash_usafe);
    (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(hash_cans);
    (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(telemetry);

  }

  escapeSQL(str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
      switch (char) {
        case "'":
          return "''";
        default:
          return char;
      }
    });
  }
}
