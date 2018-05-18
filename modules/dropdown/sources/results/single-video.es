import GenericResult from './generic';
import VideoResult from './video';

export default class SingleVideoResult extends GenericResult {
  get template() {
    return 'single-video';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get videoResult() {
    const richData = this._extra.rich_data || {};

    return new VideoResult(this, {
      url: this.url,
      title: this.title,
      thumbnail: richData.thumbnail,
      duration: richData.duration,
      views: richData.views,
      isSingleVideo: true,
      text: this.query,
      friendlyUrl: this.friendlyUrl,
    });
  }
}
