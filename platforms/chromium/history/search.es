
export default function historySearch(q, callback, searchParam) {
  function matchTypeToStyle(type) {
    if (!type) {
      return 'favicon';
    }
    type = type.toLowerCase();
    if (type.startsWith('history')) {
      return 'favicon'
    }
    return type;
  }

  chrome.cliqzSearchPrivate.queryHistory(q, (query, matches, finished) => {
    var res = matches.map(function(match) {
      return {
        value:   match.url,
        comment: match.description,
        style: matchTypeToStyle(match.provider_type),
        image:   '',
        label:   ''
      };
    });
    callback({
      query: query,
      results: res,
      ready: true
    });
  });
};