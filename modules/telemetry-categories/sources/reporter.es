/**
* @namespace telemetry-categories
*/


import { utils } from 'core/cliqz';
import { readFile } from 'core/fs';
import HistoryManager from "core/history-manager";

function log(s){
	utils.log(s, 'CATEGORIES')
}

const ONE_DAY = 24 * 60 * 60 * 1000,
      ONE_MONTH = 30 * ONE_DAY,
      SEND_INTERVAL = 20 * 60 * 1000; //20 minutes

export default class {
  /**
  * Gets an idea of the categories a user is interested in.
  * Categories are lists of domains and we should never aggregate very specifically to avoid privacy issues
  * eg:  One category can be shopping and the domains: amazon, ebay, zalando.
  *      We will only send to the backend information related with the category and not with any particular domain
  * @class Reporter
  * @constructor
  * @param categories
  */
  constructor(categories) {
    // timers
    this.t0 = this.tH = this.tD = null;
    this.isRunning = false;
    this.categories = categories;
  }
  /**
  * @method start
  */
  start() {
    this.sendData();
    //wait 5 minutes to do this operation
    this.t0 = utils.setTimeout(this.sendHistoricalData.bind(this), 5 * 60 *1000)

    log('init');
  }
  /**
  * @method stop
  */
  stop() {
		this.sendData();
		utils.clearTimeout(this.t0);
		utils.clearTimeout(this.tH);
		utils.clearTimeout(this.tD);

		log('unloaded');
  }
  /**
  * @method updateCategories
  * @param categories
  */
  updateCategories( categories ) {
    this.sendData();

    this.categories = categories;
  }
  /**
  * @method assess
  * @param url {string}
  */
  assess(url) {
    var u = utils.getDetailsFromUrl(url), tests = {};
    tests[u.host] = true;
    tests[u.domain] = true;
    //we can add more tests, eg - with path

    for(var k in tests){
        // only aggregate on category level to avoid privacy leaks !!
        var c = this.categories[utils.hash(k)];
        if(c){
            var t = JSON.parse(utils.getPref('cat', '{}'))
            t[c] = t[c] || { v:0, d:0 };
            if(t[c].d + 5000 < Date.now()){ //only update if the last update was more than 5 seconds ago
                t[c].v++;
                t[c].d = Date.now();
                utils.setPref('cat', JSON.stringify(t))
            }

            log(JSON.stringify(t));
        }
    }
  }
  /**
  * @method sendData
  */
  sendData(){
    utils.clearInterval( this.tD );

    log('send DATA');

    var data = JSON.parse(utils.getPref('cat', '{}'));
    if(Object.keys(data).length !== 0){
      var action = {
        type: 'cat',
        data: data,
        version: this.categories.version,
      };
      utils.setPref('cat', '{}');

      utils.telemetry(action);
    }

    this.tD = utils.setTimeout(this.sendData.bind(this), SEND_INTERVAL)
  }
  /**
  * @method sendHistoricalData
  */
  sendHistoricalData(){
    utils.clearInterval( this.tH );

    log('send HISTORY');

    var categories = this.categories;

    var start = Date.now(), t = {};
    //send the signal maximum 1 time per day
    if(parseInt(utils.getPref('catHistoryTime', '0')) + ONE_DAY < start){
      utils.setPref('catHistoryTime', ''+start);

      HistoryManager.PlacesInterestsStorage._execute(
          'SELECT * FROM moz_places WHERE last_visit_date>:date',
          ['url', 'last_visit_date', 'visit_count'],
          function onRow(r){
              var u = utils.getDetailsFromUrl(r.url), tests = {};
              tests[u.host] = true;
              tests[u.domain] = true;
              //we can add more tests, eg - with path

              for(var k in tests){
                  var c = categories[utils.hash(k)];
                  if(c){
                      t[c] = t[c] || {v:0, u:0, d:0}
                      t[c].u++;
                      t[c].v += r.visit_count;
                      t[c].d = t[c].d < r.last_visit_date ? r.last_visit_date : t[c].d;
                  }
              }
          }.bind(this),
          {
            date: (Date.now() - ONE_MONTH) * 1000
          }).then(function() {
            var action = {
              type: 'cat_history',
              data: t,
              version: categories.version,
              duration: Date.now()-start
            };

            utils.telemetry(action);
          });
    }

    this.tH = utils.setTimeout(this.sendHistoricalData.bind(this), 60 * 60 * 1000)
  }
}
