import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';
import { urlStripProtocol } from '../../../core/url';

const isAd = l => l.extra && l.extra.is_ad;

function getCompletion(query, link) {
  if (isAd(link)) {
    return '';
  }

  const url = link.url;

  if (!query || !url) {
    return '';
  }

  const strippedUrl = urlStripProtocol(url);
  const strippedQuery = urlStripProtocol(query, { stripTrailingSlash: false });

  // in case a typed query fully matches the url, we do not cosider it
  // an autocompletable, so instant result will be shown and if used will
  // not be counted as provided by Cliqz
  if (
    (url === query)
    || (url === strippedQuery)
    || (strippedUrl === query)
    || (strippedUrl === strippedQuery)
  ) {
    return '';
  }


  let completion = '';

  if (url.startsWith(query)) {
    completion = url.substring(query.length);
  }

  if (url.startsWith(strippedQuery)) {
    completion = url.substring(strippedQuery.length);
  }

  if (strippedUrl.startsWith(query)) {
    completion = strippedUrl.substring(query.length);
  }

  if (strippedUrl.startsWith(strippedQuery)) {
    completion = strippedUrl.substring(strippedQuery.length);
  }

  return completion;
}

export default config => pipe(map((result) => {
  const options = config.operators.addCompletion;

  return {
    ...result,
    // TODO: handle other parts of the response (like providers)
    responses: result.responses.map(response => ({
      ...response,
      results: response.results.map(r => ({
        // TODO: handle other parts of the result (what is there?)
        links: r.links.map((l) => {
          if (options.providerBlacklist.indexOf(l.provider) >= 0) {
            return l;
          }

          return {
            ...l,
            meta: {
              ...l.meta,
              completion: getCompletion(result.query.query, l),
            }
          };
        }),
      })),
    }))
  };
}));
