const getResponse = (provider, config, query, results, state) =>
  Object.assign(Object.create(null), {
    provider,
    config,
    query,
    results,
    state,
  });

const getEmptyResponse = (provider, config, query) =>
  getResponse(provider, config, query, [], 'done');

const getPendingResponse = (provider, config, query) =>
  getResponse(provider, config, query, [], 'pending');

export { getResponse, getEmptyResponse, getPendingResponse };
