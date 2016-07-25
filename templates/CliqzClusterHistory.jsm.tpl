'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzClusterHistory'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterSeries',
  'chrome://cliqzmodules/content/CliqzClusterSeries.jsm');

/******************************************************
 * Warning: this file is auto-generated; do not edit. *
 ******************************************************/

$DSL_OUTPUT

var CliqzClusterHistory = CliqzClusterHistory || {
    LOG_KEY: 'CliqzClusterHistory',
    templates: templates,  // to export the templates for testing
    log: function(str) {
        CliqzUtils.log(str, CliqzClusterHistory.LOG_KEY);
    },

    /**
     * Tries to cluster the history.
     *
     * @return <tt>[is_clustered, filtered_history]</tt>: if the history could
     *         be clustered, @c is_clustered will be true and
     *         @c filtered_history will contain all the items in the history
     *         that do not lead to the clustered domain; otherwise, we return
     *         @c false and the full history.
     */
    cluster: function(history, cliqzResults, q) {
        // returns null (do nothing) if less that 5 results from history and one domains does not take >=70%
        if (history==null) return [false, null];

        var freqHash = {};
        var maxCounter = -1;
        var maxDomain = null;
        var historyTrans = [];

        for (let i = 0; history && i < history.matchCount; i++) {
            let style = history.getStyleAt(i),
                value = history.getValueAt(i),
                image = history.getImageAt(i),
                comment = history.getCommentAt(i),
                label = history.getLabelAt(i);

                historyTrans.push({style: style, value: value, image: image, comment: comment, label: label});
                var urlDetails = CliqzUtils.getDetailsFromUrl(value),
                    domain = urlDetails.host;;

                if (freqHash[domain]==null) freqHash[domain]=[];
                freqHash[domain].push(i);

                if (freqHash[domain].length>maxCounter) {
                    maxDomain = domain;
                    maxCounter = freqHash[domain].length;
                }
        }

        CliqzClusterHistory.log('maxDomain: ' + maxDomain);

        if (history.matchCount < 10) {
            CliqzClusterHistory.log('History cannot be clustered, matchCount < 10');
            return [false, historyTrans];
        }

        var historyTransFiltered = [];
        var historyTransRemained = [];
        let j = 0;
        for (let i=0; i<freqHash[maxDomain].length; i++) {
            for (; j <= freqHash[maxDomain][i]; j++) {
                if (j < freqHash[maxDomain][i]) {
                    historyTransRemained.push(historyTrans[j]);
                } else {
                    historyTransFiltered.push(historyTrans[j]);
                }
            }
        }
        while (j < historyTrans.length) {
            historyTransRemained.push(historyTrans[j]);
            j++;
        }

        // has templates? if not quit and do the normal history, if so, then convert the maxDomain
        // to sitemap. This check is done again within CliqzClusterHistory.collapse but it's better to do
        // it twice so that we can avoid doing the filtering by now.
        if (templates[maxDomain] == null && q.length <= 6 && q.length > 1) {
            var seriesClusteredHistory2 = CliqzClusterSeries.collapse(historyTransFiltered, cliqzResults, q);
        }

        else if (templates[maxDomain]==null && q.length > 6) {
            // in principle there is not template, but we must check for the possibility that falls to a
            // misc category,

            var seriesClusteredHistory = CliqzClusterSeries.collapse(historyTransFiltered, cliqzResults, q);
            if (seriesClusteredHistory) {
                historyTransFiltered[0]['data'] = seriesClusteredHistory;
                historyTransFiltered[0]['style'] = 'cliqz-series';
                var v = [true, [historyTransFiltered[0]].concat(historyTransRemained)];

                CliqzClusterHistory.log(JSON.stringify([historyTransFiltered[0]]));
                return v;

            }
            else {
                CliqzClusterHistory.log('No templates for domain: ' + maxDomain);
                return [false, historyTrans];
            }
        }

        if (maxCounter < (history.matchCount * 0.50)) {
            CliqzClusterHistory.log('History cannot be clustered, maxCounter < belowThreshold: ' + maxCounter + ' < ' + history.matchCount * 0.60);
            return [false, historyTrans];
        }

        CliqzClusterHistory.log(JSON.stringify([maxDomain, maxCounter, history.matchCount, freqHash]));


        var clusteredHistory = CliqzClusterHistory.collapse(maxDomain, historyTransFiltered);

        if (!clusteredHistory) {
            // the collapse failed, perhaps: too few data?, missing template, error?
            // if clusteredHistory return the normal history

            CliqzClusterHistory.log('History cannot be clustered, clusteredHistory is null');
            return [false, historyTrans];
        } else if (clusteredHistory['topics'].length == 0) {
            // no URLs related to the topics defined for the site found in
            // the history URLs
            CliqzClusterHistory.log('History cannot be clustered, no URLs related to the topics');
            return [false, historyTrans];
        } else {
            historyTransFiltered[0]['data'] = clusteredHistory;
            historyTransFiltered[0]['style'] = 'cliqz-cluster';
            var v = [true, [historyTransFiltered[0]].concat(historyTransRemained)];

            CliqzClusterHistory.log(JSON.stringify([historyTransFiltered[0]]));
            return v;
        }
    },
    collapse: function(domainForTemplate, filteredHistory) {
        CliqzClusterHistory.log('Collapsing domain: ' + domainForTemplate + ' ' + filteredHistory.length + ' items');
        var template = templates[domainForTemplate];
        if (!template) return null;

        return template.fun(filteredHistory);
    },
};
