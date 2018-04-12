/* eslint no-param-reassign: 'off' */

export default function historySearch(q, callback) {
  function matchTypeToStyle(type) {
    if (!type) {
      return 'favicon';
    }
    type = type.toLowerCase();
    if (type.startsWith('history')) {
      return 'favicon';
    }
    return type;
  }

  chrome.cliqzSearchPrivate.queryHistory(q, (query, matches) => {
    const res = matches.map(match => ({
      value: match.url,
      comment: match.description,
      style: matchTypeToStyle(match.provider_type),
      image: '',
      label: ''
    }));
    callback({
      query,
      results: res,
      ready: true
    });
  });
}
