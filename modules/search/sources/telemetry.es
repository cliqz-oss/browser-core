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
