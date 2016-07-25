'use strict';
const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu
} = Components;

var EXPORTED_SYMBOLS = ['CliqzHistoryAnalysis'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

var CliqzHistoryAnalysis = {
  REPEAT_TIMER: 1000 * 60 * 60 * 24 * 7, // Once per week
  sessions: null,
  tmp: null,
  initData: function(callback, useQuery) {
    CliqzHistoryAnalysis.sessions = [];
    CliqzHistory.SQL("select \
    url, last_query, last_query_date, visit_date, typed, link, result, autocomplete, google, bookmark\
    from visits", function(r) {
      var visit = {
        url: !useQuery ? r[0] : r[1],
        visitDate: r[3],
        typed: r[4],
        link: r[5],
        result: r[6],
        autocomplete: r[7],
        google: r[8],
        bookmark: r[9]
      };
      var session = r[2];
      if (!CliqzHistoryAnalysis.sessions[session])
        CliqzHistoryAnalysis.sessions[session] = [];
      CliqzHistoryAnalysis.sessions[session].push(visit);
    }, function() {
      if (callback) callback();
    });
  },
  getRevisits: function() {
    var result = [];
    for (var sessionId in CliqzHistoryAnalysis.sessions) {
      var session = CliqzHistoryAnalysis.sessions[sessionId];
      var sessionUrls = [];
      for (var i = 0; i < session.length; i++) {
        if (!sessionUrls[session[i].url]) {
          // Use earliest occurence of url
          sessionUrls[session[i].url] = {};
          sessionUrls[session[i].url].visitDate = session[i].visitDate;
          sessionUrls[session[i].url].sessionStart = sessionId;
          sessionUrls[session[i].url].depth = i;
          sessionUrls[session[i].url].type = CliqzHistoryAnalysis.getSessionStartType(session);
        }
      }
      // Add to result
      for (var url in sessionUrls) {
        if (!result[url]) result[url] = [];
        result[url].push(sessionUrls[url]);
      }
    }
    return {
      results: result,
      sessionCount: Object.keys(CliqzHistoryAnalysis.sessions).length
    };
  },
  getSessionStartType: function(session) {
    var first = session[0];
    if(first.typed) return "typed";
    if(first.link) return "link";
    if(first.result) return "result";
    if(first.autocomplete) return "autocomplete";
    if(first.google) return "google";
    if(first.bookmark) return "bookmark";
    return "other";
  },
  analyseRevisits: function(data, visitCount, compareFunction) {
    var result = {};
    var filtered = [];
    var urlCount = Object.keys(data).length;
    var sum = 0;

    var toDays = function(ts) {
      return parseFloat((ts / 1000 / 60 / 60 / 24).toFixed(4));
    };

    // Filter
    for (var url in data) {
      if ((compareFunction && compareFunction(data[url].length, visitCount)) ||
        data[url].length == visitCount) {
        filtered[url] = data[url]
          .sort(CliqzHistoryAnalysis.sortVisits(false, "visitDate"));
        filtered[url].avgRevisit = CliqzHistoryAnalysis
          .getAvgRevisit(filtered[url]);
        sum += filtered[url].avgRevisit;
      }
    }
    // Average
    var filteredUrlCount = Object.keys(filtered).length;
    var avg = sum / filteredUrlCount;
    result.visitCount = visitCount;
    result.count = filteredUrlCount;
    result.share = parseFloat((filteredUrlCount / urlCount).toFixed(4));
    result.revisitInDays = {};
    result.revisitInDays.avg = toDays(avg);

    // Standard Deviation
    sum = 0;
    for (var url in filtered) {
      sum += (avg - filtered[url].avgRevisit) * (avg - filtered[url].avgRevisit);
    }
    var dev = Math.sqrt(sum / filteredUrlCount);
    result.revisitInDays.deviation = toDays(dev);

    // Mean
    var arr = [];
    for (var key in filtered) arr.push(filtered[key]);
    if(arr.length > 0) {
      var sorted = arr.sort(CliqzHistoryAnalysis.sortVisits(false, "avgRevisit"));
      var q1 = sorted[parseInt(sorted.length * 0.25)].avgRevisit;
      var q2 = sorted[parseInt(sorted.length * 0.5)].avgRevisit;
      var q3 = sorted[parseInt(sorted.length * 0.75)].avgRevisit;
      result.revisitInDays.q1 = toDays(q1);
      result.revisitInDays.q2 = toDays(q2);
      result.revisitInDays.q3 = toDays(q3);
    }

    // Calculate average time for revisitation
    var tmp = [];
    var cnt = 0;
    sum = 0;

    var toTargetFirst=[], toTargetLast=[];

    if(visitCount >= 2) {
      for (var url in filtered) {
        var firstVisit = filtered[url][0].visitDate -
          filtered[url][0].sessionStart;
        toTargetFirst.push(firstVisit);
        for(var i=1; i<filtered[url].length; i++) {
          var curVisit = filtered[url][i].visitDate -
                         filtered[url][i].sessionStart;
          tmp.push(curVisit-firstVisit);
          sum += (curVisit-firstVisit);
          toTargetLast.push(curVisit);
          cnt++;
        }
      }
    }
    if(tmp.length > 0) {
      tmp = tmp.sort(CliqzHistoryAnalysis.sortNumber);
      result.revisitationDiffInSec = {};
      result.revisitationDiffInSec.avg = parseFloat(((sum/cnt)/1000).toFixed(2));
      result.revisitationDiffInSec.q1 = parseFloat((tmp[parseInt(tmp.length*0.25)]/1000).toFixed(2));
      result.revisitationDiffInSec.q2 = parseFloat((tmp[parseInt(tmp.length*0.5)]/1000).toFixed(2));
      result.revisitationDiffInSec.q3 = parseFloat((tmp[parseInt(tmp.length*0.75)]/1000).toFixed(2));

      toTargetFirst = toTargetFirst.sort(CliqzHistoryAnalysis.sortNumber);
      toTargetLast = toTargetLast.sort(CliqzHistoryAnalysis.sortNumber);
      result.visitTimeInSec = {};
      result.visitTimeInSec.first = {};
      result.visitTimeInSec.last = {};
      result.visitTimeInSec.first.q1 = parseFloat((toTargetFirst[parseInt(toTargetFirst.length*0.25)]/1000).toFixed(2));
      result.visitTimeInSec.first.q2 = parseFloat((toTargetFirst[parseInt(toTargetFirst.length*0.5)]/1000).toFixed(2));
      result.visitTimeInSec.first.q3 = parseFloat((toTargetFirst[parseInt(toTargetFirst.length*0.75)]/1000).toFixed(2));
      result.visitTimeInSec.last.q1 = parseFloat((toTargetLast[parseInt(toTargetLast.length*0.25)]/1000).toFixed(2));
      result.visitTimeInSec.last.q2 = parseFloat((toTargetLast[parseInt(toTargetLast.length*0.5)]/1000).toFixed(2));
      result.visitTimeInSec.last.q3 = parseFloat((toTargetLast[parseInt(toTargetLast.length*0.75)]/1000).toFixed(2));

    }

    // Depth comparison
    tmp = [];
    sum = 0;
    cnt = 0;
    if(visitCount >= 2) {
      for (var url in filtered) {
        var firstVisit = filtered[url][0].depth;
        for(var i=1; i<filtered[url].length; i++) {
          var curVisit = filtered[url][i].depth;
          tmp.push(curVisit-firstVisit);
          sum += (curVisit-firstVisit);
          cnt++;
        }
      }
    }
    if(tmp.length > 0) {
      tmp = tmp.sort(CliqzHistoryAnalysis.sortNumber);
      result.depthDiff = {};
      result.depthDiff.avg = parseFloat((sum/cnt).toFixed(2));
      result.depthDiff.q1 =  parseFloat(tmp[parseInt(tmp.length*0.25)].toFixed(2));
      result.depthDiff.q2 =  parseFloat(tmp[parseInt(tmp.length*0.5)].toFixed(2));
      result.depthDiff.q3 =  parseFloat(tmp[parseInt(tmp.length*0.75)].toFixed(2));
    }

    // Session start types
    var typesStart = {};
    var typesRevisit = {};
    cnt = 0;
    for(var url in filtered) {
      var typeStart = filtered[url][0].type;
      for(var i=1; i<filtered[url].length; i++) {
        var typeRevisit = filtered[url][i].type;
        if(!typesRevisit[typeRevisit]) typesRevisit[typeRevisit] = 1;
        else typesRevisit[typeRevisit] += 1;
        cnt++;
      }

      if(!typesStart[typeStart]) typesStart[typeStart] = 1;
      else typesStart[typeStart] += 1;
    }
    for(var key in typesStart)
      typesStart[key] = parseFloat((typesStart[key] / filteredUrlCount).toFixed(2));
    for(var key in typesRevisit)
      typesRevisit[key] = parseFloat((typesRevisit[key] / cnt).toFixed(2));
    result.firstVisitTypes = typesStart;
    result.lastVisitTypes = typesRevisit;

    return result;

  },
  sortVisits: function(desc, key) {
    return function(a, b) {
      return desc ? ~~(key ? a[key] < b[key] : a < b) : ~~(key ? a[key] > b[key] : a > b);
    };
  },
  sortNumber: function(a,b) {
    return a - b;
  },
  getAvgRevisit: function(urlData) {
    var lastVisit = urlData[0].visitDate;
    var sum = 0;
    for (var i = 1; i < urlData.length; i++) {
      var visitDate = urlData[i].visitDate;
      sum += visitDate - lastVisit;
      lastVisit = visitDate;
    }
    if (sum) return sum / (urlData.length - 1);
    else return 0;
  },
  startAnalysis: function() {
    var startTime = Date.now();
    if(!CliqzHistoryAnalysis.check(startTime)) return;

    var result = {};
    CliqzHistoryAnalysis.initData(function() {
      result.urlVisits = {};
      var revisits = CliqzHistoryAnalysis.getRevisits();
      var data = revisits.results;
      result.urlVisits.urlCount = Object.keys(data).length;
      result.urlVisits.sessionCount = revisits.sessionCount;

      for(var i=1; i<8; i++) {
        result.urlVisits[""+i] = CliqzHistoryAnalysis.analyseRevisits(data, i);
      }
      result.urlVisits[">=8"] = CliqzHistoryAnalysis.analyseRevisits(data, 8, function(a,b) {return a>= b});

      CliqzHistoryAnalysis.initData(function() {
        result.queries = {};
        var revisits = CliqzHistoryAnalysis.getRevisits();
        var data = revisits.results;
        result.queries.queryCount = Object.keys(data).length;
        result.queries.sessionCount = revisits.sessionCount;

        for(var i=1; i<8; i++) {
            result.queries[""+i] = CliqzHistoryAnalysis.analyseRevisits(data, i);
          }
          result.queries[">=8"] = CliqzHistoryAnalysis.analyseRevisits(data, 8, function(a,b) {return a>= b});

          var action = {
  					type: 'history_revisit',
  					data: result,
  					duration: Date.now()-startTime
  				};
          CliqzUtils.telemetry(action);
      }, true);
    });
  },
  check: function(start) {
    if(CliqzUtils.getPref('historyStats', false) &&
      parseInt(CliqzUtils.getPref('historyAnalysisTime', '0')) + CliqzHistoryAnalysis.REPEAT_TIMER < start){
  		CliqzUtils.setPref('historyAnalysisTime', ''+start);
      return true;
    } else {
      return false;
    }
  }
};
