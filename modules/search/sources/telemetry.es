import { getDetailsFromUrl } from '../core/url';

const getOrigin = ({ provider, type }) => {
  if (provider === 'cliqz' || provider === 'history' || provider === 'calculator') {
    return 'cliqz';
  }

  if (provider === 'instant') {
    if (type === 'supplementary-search') {
      return 'other';
    }
    if (type === 'navigate-to') {
      return 'direct';
    }
  }

  return null;
};

// 'X|{"class":"EntityGeneric"}' -> { source: 'X', class: 'EntityGeneric' }
const parseKindItem = (item) => {
  const [source, params] = item.split('|');
  return {
    source,
    class: JSON.parse(params || '{}').class,
  };
};

// ['m', 'X|{"class":"EntityGeneric"}'] -> { sources: ['m', 'X'], classes: ['EntityGeneric']}
const parseKind = (kind) => {
  const items = kind.map(parseKindItem);
  return {
    sources: [...new Set(items.map(item => item.source))],
    classes: [...new Set(items.map(item => item.class).filter(Boolean))],
  };
};

const isSearchEngine = (url) => {
  try {
    const { name, subdomains, path } = getDetailsFromUrl(url);
    // allow only 'www' and 'de' (for Yahoo) subdomains to exclude
    // 'maps.google.com' etc. and empty path only to exclude
    // 'www.google.com/maps' etc.
    const [firstSubdomain] = subdomains;
    const hasNoPath = !path || (path.length === 1 && path[0] === '/');

    return hasNoPath && (
      (
        (
          name === 'google' ||
          name === 'bing' ||
          name === 'duckduckgo' ||
          name === 'startpage'
        ) && (!firstSubdomain || firstSubdomain === 'www')
      ) ||
      (
        name === 'yahoo' &&
        (!firstSubdomain || firstSubdomain === 'de')
      )
    );
  } catch (e) {
    return false;
  }
};

const telemetry = (focus$, query$, results$, selection$) => {
  // streams latest result and selection (of ongoing search session)
  const sessions$ = focus$
    // new session starts on URL bar focus
    .filter(({ event }) => event === 'focus')
    // TODO: results should be embedded in a surrounding data structure
    //       from the beginning
    .switchMap(() => results$
      .startWith([])
      .map(results => ({ results, ts: Date.now() }))
      .combineLatest(
        selection$.startWith({}),
        query$
          .scan((hasUserInput, { isPasted, isTyped }) =>
            hasUserInput || isPasted || isTyped, false)
          .startWith(false),
      )
    ).share();

  const telemetry$ = focus$
    // emit telemetry on session end, which is URL bar blur
    .filter(({ event }) => event === 'blur')
    .withLatestFrom(sessions$)
    // re-order and flatten params
    .map(([blur, session]) => [...session, blur])
    .map(([
      { results, ts: resultsTs },
      selection,
      hasUserInput,
      { ts: blurTs }
    ]) => {
      const selectedResult = selection.rawResult || {};
      const metric = {
        version: 2,
        hasUserInput,
        results: results.map(({ kind }) => parseKind(kind)),
        // TODO: add session duration
        selection: {
          action: selection.action,
          element: selection.elementName,
          index: selectedResult.index,
          isAutocomplete: !!selection.isFromAutocompletedURL,
          // note: is false for origin 'other', only applies to 'cliqz' and
          //       'direct' selections
          isSearchEngine: isSearchEngine(selectedResult.url),
          // TODO: verify that 'kind' contains the correct information for deep results
          ...parseKind(selectedResult.kind || []),
          origin: getOrigin(selectedResult),
          queryLength: selection.query && selection.query.length,
          // TODO: move to results
          showTime: results.length > 0 ? blurTs - resultsTs : null,
          subResult: selectedResult.subResult,
        },
      };
      return metric;
    });

  return telemetry$;
};

export default telemetry;
export { parseKindItem, parseKind };
