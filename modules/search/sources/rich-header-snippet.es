import { fetch } from '../core/http';

const _getSnippet = (url, data) => fetch(url, { method: 'PUT', body: data, credentials: 'omit', cache: 'no-store' })
  .then(r => r.json())
  .then((response) => {
    const oldResult = JSON.parse(data).results[0];
    const result = response.results.find(r => oldResult.url === r.url);
    const snippet = result.snippet;
    if (!snippet) {
      throw new Error('unknown');
    }
    if (snippet && snippet.friendlyUrl === 'n/a') {
      throw new Error('n/a');
    }
    return snippet;
  });

export default function getSnippetPromise(url, data, retry = 0) {
  if (retry === 0) {
    return Promise.reject();
  }

  return _getSnippet(url, data).catch((e) => {
    if (e.message === 'n/a') {
      return getSnippetPromise(url, data, retry - 1);
    }

    return Promise.reject();
  });
}
