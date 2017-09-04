import utils from '../core/utils';

export default class {

  constructor() {
    this.cache = Object.create(null);
  }

  getSnippet(url) {
    const mixerUrl = `https://api.cliqz.com/api/v2/results?q=${url}`;

    if (url in this.cache) {
      return Promise.resolve(this.cache[url]);
    }

    return utils.promiseHttpHandler('GET', mixerUrl, {}, 2000).then((response) => {
      const payload = JSON.parse(response.response);
      const snippet = payload.results[0].snippet;

      this.cache[url] = {
        snippet: snippet.description,
        links: snippet.deepResults,
      };

      return this.cache[url];
    }, () => {});
  }

}
