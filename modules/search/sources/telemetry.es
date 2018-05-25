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

const telemetry = (focus$, results$, selection$) => {
  // streams latest result and selection (of ongoing search session)
  const sessions$ = focus$
    // new session starts on URL bar focus
    .filter(ev => ev === 'focus')
    .switchMap(() => results$.startWith([])
      .combineLatest(selection$.startWith({})))
    .share();

  const telemetry$ = focus$
    // emit telemetry on session end, which is URL bar blur
    .filter(ev => ev === 'blur')
    .withLatestFrom(sessions$)
    // remove 'blur'
    .map(([, session]) => session)
    .map(([finalResults, selection]) => {
      const selectedResult = selection.rawResult || {};
      const search = {
        // TODO: split 'kind' into 'sources' and 'classes'
        finalResults: finalResults.map(({ kind }) => ({ kind })),
        // TODO: add session duration
        // TODO: rename into 'selectedResult'?
        selection: {
          origin: getOrigin(selectedResult),
          action: selection.action,
          isAutocomplete: !!selection.isFromAutocompletedURL,
          queryLength: selection.query && selection.query.length,
          // TODO: split 'kind' into 'sources' and 'classes'
          // TODO: verify that 'kind' contains the correct information for deep results
          kind: selectedResult.kind,
          // TODO: add 'isSearchEngine'
          // TODO: add 'element' (aka 'extra')
          // TODO: add 'index'
          // note: is false for origin 'other', only applies to 'cliqz' and
          //       'direct' selections
          isSearchEngine: isSearchEngine(selectedResult.url),
        },
      };
      return {
        type: 'activity',
        action: 'search',
        search,
        version: 1,
      };
    });

  return telemetry$;
};

export default telemetry;
