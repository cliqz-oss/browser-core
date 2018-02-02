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
    // note: results are not used yet, but will be used in later stages
    .switchMap(() => results$.startWith({})
      .combineLatest(selection$.startWith({})))
    .share();

  const telemetry$ = focus$
    // emit telemetry on session end, which is URL bar blur
    .filter(ev => ev === 'blur')
    .withLatestFrom(sessions$)
    // remove 'blur'
    .map(([, session]) => session)
    .map(([, selection]) => {
      const result = selection.rawResult || {};
      const search = {
        // TODO: add session duration
        selection: {
          origin: getOrigin(result),
          action: selection.action,
          target: selection.target,
          isAutocomplete: selection.isFromAutocompletedURL,
          queryLength: selection.query && selection.query.length,
          // TODO: split 'kind' into 'sources' and 'classes'
          // TODO: verify that 'kind' contains the correct information for deep results
          kind: result.kind,
          // TODO: add 'isSearchEngine'
          // TODO: add 'element' (aka 'extra')
          // TODO: add 'index'
        },
        // TODO: add (final) results stats
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
