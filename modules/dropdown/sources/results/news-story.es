import GenericResult from './generic';
import NewsResult from './news';

export default class NewsStoryResult extends GenericResult {
  get template() {
    return 'news-story';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get _richData() {
    return this._extra.rich_data || {};
  }

  get _deepResults() {
    return (this.rawResult.data && this.rawResult.data.deepResults) || [];
  }

  get _newStoryLinks() {
    const newStory = this._deepResults.find(deepResult => deepResult.type === 'news-story') || {
      links: [],
    };
    return newStory.links || [];
  }

  get selectableResults() {
    return [
      this.newsStoryResult,
      ...this.moreNewsStoryResults,
    ];
  }

  get newsStoryResult() {
    return new NewsResult(this, {
      url: this.url,
      domain: this._richData.source_name,
      title: this.title,
      thumbnail: this._extra.media,
      description: this.description,
      creation_time: this._richData.discovery_timestamp,
      showLogo: true,
      isBreakingNews: this._richData.breaking,
      text: this.query,
    });
  }

  get moreNewsStoryResults() {
    return this._newStoryLinks.map(article => new NewsResult(this, {
      url: article.url,
      domain: article.extra.source_name,
      title: article.title,
      thumbnail: article.extra.media,
      description: article.extra.description,
      creation_time: article.extra.discovery_timestamp,
      showLogo: true,
      isBreakingNews: article.extra.breaking,
      text: this.query,
      meta: article.meta,
    }));
  }
}
