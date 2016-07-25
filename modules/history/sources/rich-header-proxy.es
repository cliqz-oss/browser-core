import { utils } from "core/cliqz";
import { NEWS_DOMAINS } from "freshtab/news";

export default class {

  constructor() {
    this.newsCache = Object.create(null);
  }

  getNews(domain) {
    if (domain.indexOf("www.") === 0) {
      domain = domain.substring(4, domain.length);
    }

    const hash = utils.hash(domain);

    const richHeaderUrl = `https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=hb-news.cliqz.com&lang=en%2Cde&locale=en-GB&q=[${hash}]`;

    if (!(hash in NEWS_DOMAINS)) {
      return Promise.resolve(null);
    }

    if (domain in this.newsCache) {
      return Promise.resolve(this.newsCache[domain]);
    } else {
      return utils.promiseHttpHandler("GET", richHeaderUrl, {}, 2000).then( response => {
        const payload = JSON.parse(response.response);
        const news = payload.results[0].news[domain];

        this.newsCache[domain] = news;

        return news;
      }, () => {});
    }
  }
}
