import Rx from '../../platform/lib/rxjs';
import { fetch as f } from '../../core/http';
import utils from '../../core/utils';
import BaseProvider from './base';
import { getResponse } from '../responses';


// TODO: make DRY (this is the same as in `cliqz`)
const mapResults = (query, results) =>
  results.map((result) => {
    const snippet = result.snippet || {};
    return {
      ...result,
      url: result.url,
      originalUrl: result.url,
      title: snippet.title,
      type: result.type,
      text: query,
      description: snippet.description,
      provider: 'rich-header',
      data: {
        ...snippet,
        template: result.template,
      },
    };
  });

export default class RichHeader extends BaseProvider {
  constructor() {
    super('rich-header');
  }

  createMessageBody(query, links) {
    return JSON.stringify({
      q: query,
      results: links
        .map(({ extra: snippet, template, url }) => ({
          snippet,
          template,
          url,
        })),
    });
  }

  fetch(query, links) {
    const url = utils.RICH_HEADER + utils.getRichHeaderQueryString(query);
    const body = this.createMessageBody(query, links);

    return f(url, { method: 'PUT', body })
      .then(response => response.json())
      .then(({ results }) => {
        const isIncomplete = results.some(result => result._incomplete);
        if (isIncomplete) {
          return Promise.reject('incomplete');
        }
        return results;
      });
  }

  // links is an array of main links from normalized results
  search(query, links, config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const { retry } = config.providers[this.id];

    return Rx.Observable
      .defer(() => this.fetch(query, links))
      .retryWhen(errors => errors
        .delay(retry.delay)
        .take(retry.count)
      )
      .map(rs => getResponse(
        this.id,
        config,
        query,
        mapResults(query, rs),
        'done',
      ))
      // TODO: do not emit empty result
      .let(this.getOperators(config, query));
  }
}
