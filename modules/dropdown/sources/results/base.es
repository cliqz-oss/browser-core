/* eslint no-use-before-define: ["error", { "classes": false }] */
import utils from '../../core/utils';
import { equals } from '../../core/url';

export function getDeepResults(rawResult, type) {
  const deepResults = (rawResult.data && rawResult.data.deepResults) || [];
  const deepResultsOfType = deepResults.find(dr => dr.type === type) || {
    links: [],
  };
  return deepResultsOfType.links || [];
}

export default class BaseResult {

  constructor(rawResult, allResultsFlat = []) {
    this.rawResult = {
      ...{ data: {} },
      ...rawResult,
    };

    // throw if main result is duplicate
    // TODO: move deduplication to autocomplete module
    if (this.rawResult.url) {
      if (allResultsFlat.some(url => equals(url, this.rawResult.url))) {
        throw new Error('duplicate');
      } else {
        allResultsFlat.push(this.rawResult.url);
      }
    }

    // TODO: move deduplication to autocomplete module
    this.rawResult.data.deepResults = (this.rawResult.data.deepResults || [])
      .map((deepResult) => {
        const type = deepResult.type;
        const links = getDeepResults(this.rawResult, type).reduce((filtered, result) => {
          let resultUrl;
          // TODO: fix the data!!!
          if (type === 'images') {
            resultUrl = (result.extra && result.extra.original_image) || result.image;
          } else {
            resultUrl = result.url;
          }

          const isDuplicate = allResultsFlat.some(url => equals(url, resultUrl));
          if (isDuplicate) {
            return filtered;
          }
          allResultsFlat.push(resultUrl);
          return [
            ...filtered,
            result,
          ];
        }, []);
        return {
          type,
          links,
        };
      });

    this.internalResultsLimit = 4;
  }

  get template() {
    return 'result';
  }

  get query() {
    return this.rawResult.text;
  }

  get cssClasses() {
    const classes = [];
    if (this.rawResult.isCluster) {
      classes.push('history-cluster');
    }
    return classes.join(' ');
  }

  get kind() {
    return this.rawResult.data.kind || [];
  }

  get title() {
    return this.rawResult.title;
  }

  get logo() {
    const urlDetails = utils.getDetailsFromUrl(this.rawResult.url);
    return utils.getLogoDetails(urlDetails);
  }

  get localSource() {
    const data = this.rawResult.data || {};
    return data.localSource || this.rawResult.style || '';
  }

  get friendlyUrl() {
    const urlDetails = utils.getDetailsFromUrl(this.rawResult.url);
    return urlDetails.friendly_url;
  }

  get isActionSwitchTab() {
    return this.localSource.indexOf('switchtab') !== -1;
  }

  get isBookmark() {
    return this.localSource.indexOf('bookmark') !== -1;
  }

  get icon() {
    let icon;

    if (this.isBookmark) {
      icon = 'bookmark';
    }

    if (this.isActionSwitchTab) {
      icon = 'switchtab';
    }

    return icon;
  }

  get url() {
    const url = this.rawResult.url;
    if (this.isActionSwitchTab) {
      return `moz-action:switchtab,${JSON.stringify({ url })}`;
    }
    return this.rawResult.url;
  }

  get displayUrl() {
    return this.rawResult.url;
  }

  get description() {
    return this.rawResult.description || '';
  }

  get image() {
    return this.rawResult.image;
  }

  // cannot limit here - inheriting results may like to have filtering
  get internalResults() {
    const deepLinks = getDeepResults(this.rawResult, 'buttons');
    return deepLinks.map(({ url, title }) => new InternalResult({
      url,
      title
    }));
  }

  get imageResults() {
    const deepLinks = getDeepResults(this.rawResult, 'images');
    return deepLinks.map(({ image, extra }) => new ImageResult({
      url: (extra && extra.original_image) || image,
      thumbnail: image,
    }));
  }

  get anchorResults() {
    const deepLinks = getDeepResults(this.rawResult, 'simple_links');
    return deepLinks.map(({ url, title }) => new AnchorResult({
      url,
      title,
    }));
  }

  get newsResults() {
    const deepLinks = getDeepResults(this.rawResult, 'news');
    return deepLinks.map(({ url, title, extra }) => new NewsResult({
      url,
      title,
      thumbnail: extra.thumbnail,
      creation_time: extra.creation_timestamp,
      tweet_count: extra.tweet_count,
      showLogo: utils.getDetailsFromUrl(this.url).domain !== utils.getDetailsFromUrl(url).domain,
    }));
  }

  get videoResults() {
    return [];
    // const deepLinks = getDeepResults(this.rawResult, 'videos');
    // return deepLinks.map(({ url, title, extra }) => new VideoResult({
    //   url,
    //   title,
    //   thumbnail: extra.thumbnail,
    //   duration: extra.duration,
    //   views: extra.views
    // }));
  }

  get selectableResults() {
    return [
      ...(this.url ? [this] : []),
      ...(this.newsResults).slice(0, 3),
      ...(this.videoResults).slice(0, 3),
      ...this.internalResults.slice(0, this.internalResultsLimit),
    ];
  }

  get allResults() {
    return [
      ...this.selectableResults,
      ...this.imageResults,
      ...this.anchorResults
    ];
  }

  findResultByUrl(href) {
    return this.allResults.find(r => equals(r.url, href));
  }

  hasUrl(href) {
    return this.allResults.some(r => equals(r.url, href));
  }

  isHistory() {
    return this.kind[0] === 'H';
  }

  click(window, href, ev) {
    // TODO: do not use global
    /* eslint-disable */
    window.CLIQZ.Core.urlbar.value = href;
    /* eslint-enable */
    window.CLIQZ.Core.urlbar.handleCommand(ev);
  }
}

class ThumbnailBlock extends BaseResult {
  get logo() {
    if (this.rawResult.showLogo) {
      return super.logo;
    }

    return null;
  }

  get thumbnail() {
    return this.rawResult.thumbnail;
  }

  get friendlyUrl() {
    return null;
    // TODO fix responsive behaviour when adding url
    // if (this.rawResult.showLogo) {
    //   return super.friendlyUrl;
    // }
  }

}


class NewsResult extends ThumbnailBlock {


  get tweetCount() {
    return this.rawResult.tweet_count;
  }

  get publishedAt() {
    return this.rawResult.creation_time;
  }
}

/*
class VideoResult extends ThumbnailBlock {

  get videoViews() {
    return this.rawResult.views;
  }

  get duration() {
    return this.rawResult.duration;
  }
}
*/

class ImageResult extends BaseResult {
  get thumbnail() {
    return this.rawResult.thumbnail;
  }
}

class InternalResult extends BaseResult {
}

class AnchorResult extends BaseResult {
}
