import GenericResult from './generic';
import NewsResult from './news';

export default class extends GenericResult {
  get template() {
    return 'news-story';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get _richData() {
    return this._extra.rich_data || {};
  }

  get selectableResults() {
    return [
      this.newsStoryResult,
    ];
  }

  get newsStoryResult() {
    return new NewsResult({
      url: this.url,
      domain: this._richData.source_name,
      title: this.title,
      thumbnail: this._extra.media,
      description: this.description,
      creation_time: this._richData.discovery_timestamp,
      showLogo: true,
      text: this.query,
    });
  }
}
