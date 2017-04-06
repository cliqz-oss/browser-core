import getDbConn from 'platform/sqlite';
import CliqzUtils from 'core/utils';

/** Sqlite table for collecting tracking information locally.
 */
export default class {
  constructor() {
    this.dbConn = getDbConn("cliqz.dbattrack");
    if (this.dbConn && this.isEnabled() ) {
      let tracking_table = "create table if not exists 'attrack_tracking' (\
              'tp' VARCHAR(16) NOT NULL,\
              'fp' VARCHAR(16) NOT NULL,\
              'key' VARCHAR(32) NOT NULL,\
              'value' VARCHAR(32) NOT NULL,\
              'count' INTEGER DEFAULT 1,\
              'lastTime' INTEGER DEFAULT 0,\
              CONSTRAINT pkey PRIMARY KEY ('tp', 'fp', 'key', 'value')\
          )";
      (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(tracking_table);
    }
  }

  loadTokens(tokens) {
    var now = (new Date()).getTime(),
        query = "INSERT OR IGNORE INTO 'attrack_tracking'\
      ('tp', 'fp', 'key', 'value', 'lastTime')\
      VALUES\
      (:tp, :fp, :key, :value, :time);\
      UPDATE 'attrack_tracking' SET\
      'count' = 'count' + 1,\
      'lastTime' = :time\
      WHERE 'tp' = :tp,\
      'fp' = :fp,\
      'key' = :key,\
      'value' = :value ;",
        stmt = this.dbConn.createStatement(query),
        params = stmt.newBindingParamsArray(),
        count = 0;

    for (var tp in tokens) {
      // skip header tokens
      if (tp.length > 16) {
        continue;
      }
      for (var fp in tokens[tp]) {
        for (var key in tokens[tp][fp]['kv']) {
          for (var token in tokens[tp][fp]['kv'][key]) {
            var bp = params.newBindingParams();
            bp.bindByName("tp", tp);
            bp.bindByName("fp", fp);
            bp.bindByName("key", key);
            bp.bindByName("value", token);
            bp.bindByName("time", now);
            params.addParams(bp);
            count++;
          }
        }
      }
    }
    if (count > 0) {
      CliqzUtils.log("Add "+ count +" tokens for hour", "attrack");
      stmt.bindParameters(params);
      stmt.executeAsync({
        handleError: function(err) {
          CliqzUtils.log(err, "xxx");
        }
      });
    }
  }

  getTrackingOccurances(cb) {
    var query = "SELECT tp, key, value, COUNT(DISTINCT fp) AS n_fp FROM attrack_tracking GROUP BY tp, key, value HAVING n_fp > 2 ORDER BY n_fp DESC",
        stmt = this.dbConn.createStatement(query);
    stmt.executeAsync({
      handleResult: function(resultSet) {
        // triple nested map
        var resultObj = []
        for (let row = resultSet.getNextRow(); row; row = resultSet.getNextRow()) {
          let tuple = ["tp", "key", "value", "n_fp"].map(col => row.getResultByName(col));
          resultObj.push(tuple);
        }
        cb(resultObj);
      }
    });
  }

  getTableSize(cb) {
    var query = "SELECT COUNT(*) AS n FROM attrack_tracking",
      stmt = this.dbConn.createStatement(query);
    stmt.executeAsync({
      handleResult: function(resultSet) {
        cb(resultSet.getNextRow().getResultByName("n"));
      }
    });
  }

  cleanTable() {
    var cutoff = (new Date()).getTime() - (1000 * 60 * 60 * 24 * 7); // 7 days ago

    var st = this.dbConn.createStatement("DELETE FROM attrack_tracking WHERE lastTime < :cutoff");
    st.params.cutoff = cutoff;
    st.executeAsync()
  }

  isEnabled() {
    return CliqzUtils.getPref('attrack.local_tracking', false);
  }

};
