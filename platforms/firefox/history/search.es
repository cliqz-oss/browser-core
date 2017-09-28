import utils from '../../core/utils';
import console from '../../core/console';
import { Components } from '../globals';


const getProvider = () => Components
  .classes['@mozilla.org/autocomplete/search;1?name=unifiedcomplete']
  .getService(Components.interfaces.nsIAutoCompleteSearch);

/* eslint-disable */

// TODO: remove code duplication with default export
export function getHistory(q, callback) {
  const provider = getProvider();
  let lastMatchCount = 0;
  return provider.startSearch(q, 'enable-actions', null, {
    onSearchResult(ctx, result) {
      const entries = [];

      for (let i = lastMatchCount; i < result.matchCount; i += 1) {

        if (result.getValueAt(i).indexOf('https://cliqz.com/search?q=') === 0) {
          continue;
        }

        if(result.getStyleAt(i).indexOf('heuristic') != -1) {
          continue;
        }

        if(result.getStyleAt(i).indexOf('switchtab') != -1) {
          try {
            let [mozAction, cleanURL] = utils.cleanMozillaActions(result.getValueAt(i));
            let label;

            // ignore freshtab and history
            if (cleanURL.indexOf('resource://cliqz/fresh-tab-frontend/') === 0) {
              continue;
            }
            if (cleanURL.indexOf('https://cliqz.com/search?q=') === 0) {
              continue;
            }

            entries.push({
              style:   result.getStyleAt(i),
              value:   cleanURL,
              image:   result.getImageAt(i),
              comment: result.getCommentAt(i),
              label:   label || cleanURL
            });
          } catch(e){
            console.log('history result error', e);
          }
        } else {
          entries.push({
            style:   result.getStyleAt(i),
            value:   result.getValueAt(i),
            image:   result.getImageAt(i),
            comment: result.getCommentAt(i),
            label:   result.getLabelAt(i)
          });
        }
      }

      const ready = result.searchResult != result.RESULT_NOMATCH_ONGOING &&
        result.searchResult != result.RESULT_SUCCESS_ONGOING;

      callback({
        query: q,
        results: entries,
        ready,
      });

      lastMatchCount = result.matchCount;
    }
  });
}

// callback called multiple times
export default (function() {
  var hist = null;

  return function(q, callback) {
    if(hist === null) { //lazy
      // history autocomplete provider is removed
      // https://hg.mozilla.org/mozilla-central/rev/44a989cf6c16
      var provider = Components.classes["@mozilla.org/autocomplete/search;1?name=history"] ||
                      Components.classes["@mozilla.org/autocomplete/search;1?name=unifiedcomplete"];
      hist = provider.getService(Components.interfaces["nsIAutoCompleteSearch"]);
    }
    hist.startSearch(q, 'enable-actions', null, {
      onSearchResult: function(ctx, result) {
        var res = [];
        for (var i = 0; result && i < result.matchCount; i++) {
          if (result.getValueAt(i).indexOf('https://cliqz.com/search?q=') === 0) {
            continue;
          }
          if(result.getStyleAt(i).indexOf('heuristic') != -1) {
            // filter out "heuristic" results
            continue;
          }

          if(result.getStyleAt(i).indexOf('switchtab') != -1) {
            try {
              let [mozAction, cleanURL] = utils.cleanMozillaActions(result.getValueAt(i));
              let label;

              // ignore freshtab and history
              if (cleanURL.indexOf('resource://cliqz/fresh-tab-frontend/') === 0) {
                continue;
              }
              if (cleanURL.indexOf('https://cliqz.com/search?q=') === 0) {
                continue;
              }

              res.push({
                style:   result.getStyleAt(i),
                value:   cleanURL,
                image:   result.getImageAt(i),
                comment: result.getCommentAt(i),
                label:   label || cleanURL
              });
            } catch(e){
              console.log('history result error', e);
            }
          }
          else {
            res.push({
              style:   result.getStyleAt(i),
              value:   result.getValueAt(i),
              image:   result.getImageAt(i),
              comment: result.getCommentAt(i),
              label:   result.getLabelAt(i)
            });
          }
        }
        callback({
          query: q,
          results: res,
          ready:  result.searchResult != result.RESULT_NOMATCH_ONGOING &&
                  result.searchResult != result.RESULT_SUCCESS_ONGOING
        })
      }
    });
  }
})();
