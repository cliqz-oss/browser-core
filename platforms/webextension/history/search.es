/* eslint no-param-reassign: 'off' */

export default function historySearch(q, callback) {
  chrome.history.search({ text: q }, (matches) => {
    const res = matches.map(match => ({
      value: match.url,
      comment: match.title,
      style: 'favicon',
      image: '',
      label: ''
    }));
    callback({
      query: q,
      results: res,
      ready: true
    });
  });
}
