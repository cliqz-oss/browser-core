import GenericResult from './generic';
import NewsResult from './news';

export default class TopNewsResult extends GenericResult {
  get template() {
    return 'top-news';
  }

  get _deepResults() {
    return (this.rawResult.data && this.rawResult.data.deepResults) || [];
  }

  get _topNewsLinks() {
    const topNews = this._deepResults.find(deepResult => deepResult.type === 'top-news') || {
      links: [],
    };
    return topNews.links || [];
  }

  get topNewsTitle() {
    return this.rawResult.data.extra && this.rawResult.data.extra.locale_title;
  }

  get topNewsResults() {
    return this._topNewsLinks.map(article => new NewsResult(this, {
      url: article.url,
      domain: article.extra.domain,
      title: article.title,
      thumbnail: article.extra.media,
      description: article.extra.description,
      creation_time: article.extra.timestamp,
      showLogo: true,
      isBreakingNews: article.extra.breaking,
      text: this.query,
      meta: article.meta, // We need this to get correct logo for deepResults
    }));
  }

  get allResults() {
    return [
      ...this.selectableResults,
    ];
  }

  get selectableResults() {
    return [
      ...this.topNewsResults,
    ];
  }
}
