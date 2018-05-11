import utils from '../core/utils';
import { equals, isCliqzAction } from '../core/url';
import SupplementarySearchResult from './results/supplementary-search';
import NavigateToResult from './results/navigate-to';

function common({ results, result, clickedResult, url }) {
  const now = Date.now();
  const signal = {
    type: 'activity',
    v: 3.0,
    result_order: results.kinds,
    query_length: results.query.length,
    current_position: results.indexOf(result),
    reaction_time: now - results.queriedAt,
    display_time: now - results.displayedAt,
    position_type: result.kind,
    local_source: clickedResult.localSource,
    search: utils.isSearch(url),
  };

  if (clickedResult !== result) {
    signal.sub_result_type = clickedResult.constructor.name;
    signal.sub_result_index = result.allResults.filter(
      r => r instanceof clickedResult.constructor).findIndex(
        r => equals(r.url, url)
    );
  }

  utils.resultTelemetry(
    results.query,
    clickedResult.isAutocompleted || false,
    signal.current_position,
    utils.isPrivateResultType(signal.position_type) ? '' : url,
    results.kinds
  );

  return signal;
}

function generateCommonStub({ query }) {
  return {
    current_position: 0,
    display_time: null,
    local_source: '',
    query_length: query.length,
    reaction_time: null,
    result_order: [],
  };
}

export function enterSignal({ result, results, clickedResult, query, newTab }) {
  const hasResults = (
    result &&
    clickedResult &&
    results &&
    results.query === query
  );

  if (hasResults && result.isCliqzAction) {
    return;
  }

  const commonParts = hasResults ?
    common({ results, result, clickedResult, url: clickedResult.url }) :
    generateCommonStub({ query });

  const enterSpecificParts = {
    action: 'result_enter',
    new_tab: newTab,
  };

  if (hasResults) {
    if (result instanceof SupplementarySearchResult) {
      // TODO: use result.kind
      enterSpecificParts.position_type = ['inbar_query'];
    } else if (result instanceof NavigateToResult) {
      // TODO: use result.kind
      enterSpecificParts.position_type = ['inbar_url'];
    }
    if (result.isAutocompleted) {
      enterSpecificParts.position_type = ['inbar_url'];
      enterSpecificParts.source = commonParts.position_type;
      enterSpecificParts.autocompleted = true;
      enterSpecificParts.autocompleted_length = result.url.length;
    }
  } else {
    const isUrl = utils.isUrl(query);
    enterSpecificParts.position_type = isUrl ? ['inbar_url'] : ['inbar_query'];
    enterSpecificParts.search = isUrl && utils.isSearch(query);
  }

  const signal = Object.assign({}, commonParts, enterSpecificParts);

  utils.telemetry(signal);
}


export function clickSignal({ extra, coordinates, results, result, url, newTab }) {
  if (isCliqzAction(url)) {
    return;
  }

  const clickedResult = result.findResultByUrl(url);
  if (clickedResult) {
    const commonPart = common({ results, result, clickedResult, url });
    const signal = Object.assign({}, commonPart, {
      action: 'result_click',
      extra,
      mouse: coordinates,
      new_tab: newTab,
    });

    utils.telemetry(signal);
  }
}

export function dropdownContextMenuSignal({ action = 'click', context = 'dropdown', target }) {
  const signal = {
    action,
    context,
    type: 'context_menu',
  };

  if (target) {
    signal.target = target;
  }

  utils.telemetry(signal);
}


export function removeFromHistorySignal({ withBookmarks = false }) {
  const signal = {
    type: 'activity',
    v: 3.0,
    action: withBookmarks ? 'remove_from_history_and_bookmarks' : 'remove_from_history'
  };

  utils.telemetry(signal);
}
