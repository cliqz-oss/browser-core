import utils from '../core/utils';
import { equals } from '../core/url';
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
    signal.sub_result_index = result.allResults.filter(r => r instanceof clickedResult.constructor).findIndex(r => equals(r.url, url));
  }

  return signal;
}

export function enterSignal({ query, dropdown, newTab }) {
  const results = dropdown.results;
  const index = dropdown.selectedIndex;
  const clickedResult = dropdown.results.get(index);
  const result = dropdown.results.find(clickedResult.url);
  const isAutocompleted = result.isAutocompleted;

  let position_type;
  if (result instanceof SupplementarySearchResult) {
    // TODO: use result.kind
    position_type = ['inbar_query'];
  } else if (result instanceof NavigateToResult) {
    // TODO: use result.kind
    position_type = ['inbar_url'];
  }

  if (isAutocompleted) {
    position_type = ['inbar_url'];
  }

  const commonPart = common({ results, result, clickedResult, url: clickedResult.url });
  const signal = Object.assign({}, commonPart, {
    action: 'result_enter',
    new_tab: newTab,
  });

  if (position_type) {
    signal.position_type = position_type;
  }

  utils.telemetry(signal);
}


export function clickSignal({ extra, coordinates, results, result, url, newTab }) {
  const clickedResult = result.findResultByUrl(url);
  const commonPart = common({ results, result, clickedResult, url });
  const signal = Object.assign({}, commonPart, {
    action: 'result_click',
    extra,
    mouse: coordinates,
    new_tab: newTab,
  });

  utils.telemetry(signal);
}

