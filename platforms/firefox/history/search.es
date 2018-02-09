import utils from '../../core/utils';
import console from '../../core/console';
import { Components } from '../globals';
import prefs from '../../core/prefs';

let _provider = null;

function getProvider() {
  if (!_provider) {
    _provider = (
      // history autocomplete provider is removed
      // https://hg.mozilla.org/mozilla-central/rev/44a989cf6c16
      Components.classes['@mozilla.org/autocomplete/search;1?name=history'] ||
      Components.classes['@mozilla.org/autocomplete/search;1?name=unifiedcomplete']
    ).getService(Components.interfaces.nsIAutoCompleteSearch);
  }
  return _provider;
}

/* eslint-disable */

// callback called multiple times
export default function getHistory(q, callback, isPrivate = false) {
  const provider = getProvider();
  let lastMatchCount = 0;
  let searchParams = ['enable-actions', 'prohibit-autofill'];
  if (isPrivate) {
    searchParams.push('disable-private-actions');
    searchParams.push('private-window');
  }

  provider.startSearch(q, searchParams.join(' '), null, {
    onSearchResult: function(ctx, result) {
      const res = [];
      // TODO: remove this check when we switch to a new mixer completely
      const isNewSearchMode = prefs.get('searchMode', 'autocomplete') !== 'autocomplete';
      for (let i = lastMatchCount; result && i < result.matchCount; i++) {
        let style = result.getStyleAt(i);
        if (result.getValueAt(i).indexOf('https://cliqz.com/search?q=') === 0) {
          continue;
        }

        if(style.includes('heuristic') || style.includes('searchengine')) {
          // filter out "heuristic" and "searchengine" results
          continue;
        }

        if(style.indexOf('switchtab') !== -1) {
          try {
            let [mozAction, cleanURL] = utils.cleanMozillaActions(result.getValueAt(i));
            let label;

            // ignore freshtab, history and cliqz search
            if (cleanURL.indexOf('chrome://cliqz') === 0 ||
                cleanURL.indexOf('resource://cliqz') === 0 ||
                cleanURL.indexOf('https://cliqz.com/search?q=') === 0) {
              continue;
            }

            res.push({
              style:   style,
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
            style:   style,
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
      });

      if (isNewSearchMode) {
        lastMatchCount = result.matchCount;
      }
    }
  });
}
