import utils from '../core/utils';
import NEWS_DOMAINS from '../freshtab/news-domains';
import config from '../core/config';

export default class RichHeaderProxy {
  constructor() {
    this.newsCache = Object.create(null);
  }

  getNews(domainName) {
    let domain = domainName;
    if (domain.indexOf('www.') === 0) {
      domain = domain.substring(4, domain.length);
    }

    const hash = utils.hash(domain);

    const richHeaderUrl = utils.RICH_HEADER + utils.getRichHeaderQueryString(`[${hash}]`);

    if (!(hash in NEWS_DOMAINS)) {
      return Promise.resolve(null);
    }

    if (domain in this.newsCache) {
      return Promise.resolve(this.newsCache[domain]);
    }

    return utils.promiseHttpHandler('PUT', richHeaderUrl, JSON.stringify({
      q: `[${hash}]`,
      results: [
        {
          url: config.settings.HB_NEWS,
          snippet: {},
        },
      ],
    }), 2000).then((response) => {
      const payload = JSON.parse(response.response);
      const news = payload.results[0].news[domain];

      this.newsCache[domain] = news;

      return news;
    }, () => {});
  }
}
