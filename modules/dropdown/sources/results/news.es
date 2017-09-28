import BaseResult from './base';

export default class NewsResult extends BaseResult {
  get logo() {
    if (this.rawResult.showLogo) {
      return super.logo;
    }

    return null;
  }

  get logoDetails() {
    if (this.thumbnail === '') {
      return super.logo;
    }

    return null;
  }

  get thumbnail() {
    return this.rawResult.thumbnail;
  }

  get tweetCount() {
    return this.rawResult.tweet_count;
  }

  get publishedAt() {
    return this.rawResult.creation_time;
  }

  get friendlyUrl() {
    return this.rawResult.domain;
  }
}
