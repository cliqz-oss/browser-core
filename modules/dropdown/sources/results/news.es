import { Subresult } from './base';
import { NEWS_RESULT, BREAKING_NEWS_RESULT } from '../result-types';

export default class NewsResult extends Subresult {
  get type() {
    if (this.isBreakingNews) {
      return BREAKING_NEWS_RESULT;
    }

    return NEWS_RESULT;
  }

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
    return this.rawResult.thumbnail || ''; // Always show thumbnail
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

  get isBreakingNews() {
    return this.rawResult.isBreakingNews;
  }
}
