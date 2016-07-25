'use strict';
/*
 * This module measures statistical data about users history
 *
 */

var EXPORTED_SYMBOLS = ['CliqzHistoryManager'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/PlacesUtils.jsm')
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzHistoryManager = {
    getStats: function(callback){
        let historysize = 0;
        let daysVisited = {};
        let visitedDomainOn = {};
        let visitedSubDomain = {};
        let today = CliqzUtils.getDay();
        let history = today;

        this.PlacesInterestsStorage
            ._execute(
                "SELECT count(*) cnt, MIN(v.visit_date) first " +
                "FROM moz_historyvisits v " +
                "JOIN moz_places h " +
                "ON h.id = v.place_id " +
                "WHERE h.hidden = 0 AND h.visit_count > 0 ",
                ["cnt", "first"],
                function(result) {
                    try {
                        history = Math.floor(result.first / 86400000000);
                        historysize = result.cnt;
                    }
                    catch(ex) {}
                }
            )
            .then(function() {
                if(CliqzUtils){
                    callback({
                        size: historysize,
                        days: CliqzUtils.getDay() - history
                    });
                }
            });
    },
    // moz_inputhistory records queries-to-URL mappings to adapt history
    // results to a user's query behavior; moz_inputhistory would be automatically
    // updated by Firefox's Places system if the dropdown was not overidden--
    // thus, we have to update moz_inputhistory manually whenever the user
    // selects a page from history or autocomplete
    updateInputHistory: function(input, url) {
        if(url.indexOf("://") == -1)
            url = "http://" + url;

        // copied from http://mxr.mozilla.org/mozilla-central/source/toolkit/components/places/nsNavHistory.cpp#4525
        var sql =
            "INSERT OR REPLACE INTO moz_inputhistory " +
            "SELECT h.id, IFNULL(i.input, :input_text), IFNULL(i.use_count, 0) * .9 + 1 " +
            "FROM moz_places h " +
            "LEFT JOIN moz_inputhistory i ON i.place_id = h.id AND i.input = :input_text " +
            "WHERE url = :page_url ";
        CliqzUtils.setTimeout(function() {
            CliqzHistoryManager.PlacesInterestsStorage
                ._execute(
                    sql,
                    // no results for INSERT
                    [],
                    function(results) { },
                    {
                        input_text: input,
                        page_url: url
                    }
                )
                .then(function() {
                    // CliqzUtils.log('updated moz_inputhistory', 'CLIQZ.HISTORY_MANAGER');
                })
            },
            // wait a bit before updating moz_inputhistory; otherwise, the URL might
            // not exist in moz_places yet and above SQL statement would not insert anything
            5000);
    },
    // Update the title of a page in the FF history database
    updatePageTitle: function(url, title) {
        if(url.indexOf("://") == -1)
            url = "http://" + url;

        var sql =
            "UPDATE moz_places " +
            "SET title = :title " +
            "WHERE url = :page_url ";

        CliqzHistoryManager.PlacesInterestsStorage
            ._execute(
                sql,
                // no results for UPDATE
                [],
                function(results) { },
                {
                    title: title,
                    page_url: url
                }
            )
            .then(function() {

            });
    },
	PlacesInterestsStorage: {
        _execute: function PIS__execute(sql, columns, onRow, parameters) {
            var conn = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection,
                statement = conn.createAsyncStatement(sql),
                onThen, //called after the async operation is finalized
                promiseMock = {
                    then: function(func){
                        onThen = func;
                    }
                };
            if(parameters){
                for(var key in parameters) {
                  statement.params[key] = parameters[key];
                }
            }
            statement.executeAsync({
                handleCompletion: function(reason)  {
                  onThen();
                },

                handleError: function(error)  {
                },

                handleResult: function(resultSet)  {
                  let row;
                  while (row = resultSet.getNextRow()) {
                    // Read out the desired columns from the row into an object
                    let result;
                    if (columns != null) {
                      // For just a single column, make the result that column
                      if (columns.length == 1) {
                        result = row.getResultByName(columns[0]);
                      }
                      // For multiple columns, put as values on an object
                      else {
                        result = {};
                        for(var i=0; i<columns.length; i++){
                            var column = columns[i];
                            result[column] = row.getResultByName(column);
                        }
                      }
                    }
                    //pass the result to the onRow handler
                    onRow(result);
                  }
                }
            });
            return promiseMock;
        }
    }
};