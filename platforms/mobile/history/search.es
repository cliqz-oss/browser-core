import window from '../window';

function displayHistory(data = {}) {
  const results = (data.results || []).map(item => {
    return {
      style: 'facicon',
      value: item.url,
      image: '',
      comment: item.title || 'no comment',
      label: ''
    };
  });
  const historyResult = { results, query: data.query, ready: true };
  window.CLIQZEnvironment.searchHistoryCallback(historyResult);
}

export default function historySearch(q, callback) {
  window.CLIQZEnvironment.displayHistory = displayHistory;
  window.CLIQZEnvironment.searchHistoryCallback = callback;
  window.osAPI.searchHistory(q, 'CLIQZEnvironment.displayHistory');
}
