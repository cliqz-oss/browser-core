const getResponse = ({
  provider,
  config,
  query,
  suggestions = [],
  results = [],
  state
}) =>
  Object.assign(Object.create(null), {
    provider,
    config,
    query,
    results,
    state,
    suggestions,
  });

const getEmptyResponse = (provider, config, query) =>
  getResponse({ provider, config, query, state: 'done' });

const getPendingResponse = (provider, config, query) =>
  getResponse({ provider, config, query, state: 'pending' });

export { getResponse, getEmptyResponse, getPendingResponse };
