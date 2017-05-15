import HistoryManager from "core/history-manager";
import CliqzUtils from 'core/utils';

var CliqzFreshTabHistory = {
  /**
   * Returns the array of top visited URLs with their titles and number of visits
   * @param {Number} limit of results
   * @returns {Array} Array of objects { url, title, total_count }
   */
  getTopUrls(limit) {
    var result = [], domains = {};
    return new Promise(function(resolve, reject){
      HistoryManager.PlacesInterestsStorage._execute(
        [
          "select distinct rev_host as rev_host, title as title, url as url, max(total_count)  as total_count from (",
          "select mzh.url as url, mzh.title as title, sum(mzh.days_count) as total_count, mzh.rev_host as rev_host",
          "from (",
            "select moz_places.url, moz_places.title, moz_places.rev_host, moz_places.visit_count,",
                   "moz_places.last_visit_date, moz_historyvisits.*,",
                   "(moz_historyvisits.visit_date /(86400* 1000000) - (strftime('%s', date('now', '-6 months'))/86400) ) as days_count",
            "from moz_historyvisits, moz_places",
            "where moz_places.typed == 1",
                  "and moz_places.hidden == 0",
                  "and moz_historyvisits.visit_date > (strftime('%s', date('now', '-6 months'))*1000000)",
                  "and moz_historyvisits.place_id == moz_places.id",
                  "and moz_places.visit_count > 1",
                  "and (moz_historyvisits.visit_type < 4 or moz_historyvisits.visit_type == 6)",
          ") as mzh",
          "group by mzh.place_id",
          "order by total_count desc, mzh.visit_count desc, mzh.last_visit_date desc",
          ") group by rev_host order by total_count desc limit 15"
        ].join(' '),
        ["rev_host", "url", "title", "total_count"],
        function(row) {

          var key = CliqzUtils.getDetailsFromUrl(row.url).cleanHost;
          if (!(key in domains)){
            result.push(row);
            domains[key]=row;
          }
        }
      ).then(function() {
        resolve(result);
        //resolve(result.slice(0,limit));
      });
    });
  }
};

export default CliqzFreshTabHistory;
