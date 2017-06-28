/* eslint no-use-before-define: ["error", { "classes": false }] */
import events from '../../core/events';
import utils from '../../core/utils';
import { equals } from '../../core/url';
import console from '../../core/console';

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
    this.actions = {};

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
    return this.rawResult.data.kind || [''];
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

  get isCliqzAction() {
    return !this.rawResult.url || this.rawResult.url.indexOf('cliqz-actions') === 0;
  }

  get isAdult() {
    const data = this.rawResult.data || {};
    const extra = data.extra || {};
    return extra.adult;
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

  get rawUrl() {
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
    if (this.isAskingForLocation) { // Hide these buttons when asking for location sharing
      return [];
    }
    const deepLinks = getDeepResults(this.rawResult, 'buttons');
    return deepLinks.map(({ url, title }) => new InternalResult({
      url,
      title,
      text: this.query,
    }));
  }

  get imageResults() {
    const deepLinks = getDeepResults(this.rawResult, 'images');
    return deepLinks.map(({ image, extra }) => new ImageResult({
      url: (extra && extra.original_image) || image,
      thumbnail: image,
      text: this.query,
    }));
  }

  get anchorResults() {
    const deepLinks = getDeepResults(this.rawResult, 'simple_links');
    return deepLinks.map(({ url, title }) => new AnchorResult({
      url,
      title,
      text: this.query,
    }));
  }

  get newsResults() {
    const deepLinks = getDeepResults(this.rawResult, 'news');
    return deepLinks.map(({ url, title, extra = {} } = {}) => new NewsResult({
      url,
      title,
      thumbnail: extra.thumbnail,
      creation_time: extra.creation_timestamp,
      tweet_count: extra.tweet_count,
      showLogo: this.url && (
        utils.getDetailsFromUrl(this.url).domain !==
        utils.getDetailsFromUrl(url).domain
      ),
      text: this.query,
    }));
  }

  /**
   * To be used with the `with` statement in the template
   */
  get shareLocationButtonsWrapper() {
    return {
      internalResults: this.shareLocationButtons,
      internalResultsLimit: 3,
      logo: null
    };
  }

  get isAskingForLocation() {
    const extra = this.rawResult.data.extra || {};
    return (extra.no_location || false) && this.actions.locationAssistant.isAskingForLocation;
  }


  get shareLocationButtons() {
    const locationAssistant = this.actions.locationAssistant;
    if (!this._shareLocationButtons) {
      this._shareLocationButtons = !this.isAskingForLocation ? [] :
        locationAssistant.actions.map((action) => {
          let additionalClassName = '';
          if (action.actionName === 'allowOnce') {
            additionalClassName = 'location-allow-once';
          }

          const result = new ShareLocationButton({
            title: action.title,
            url: `cliqz-actions,${JSON.stringify({ type: 'location', actionName: action.actionName })}`,
            text: this.rawResult.text,
            className: additionalClassName,
            locationAssistant,
            onButtonClick: () => {
              this.actions.getSnippet(this.query, this.rawResult)
                .then((snippet) => {
                  const newRawResult = Object.assign({}, this.rawResult);
                  newRawResult.data.extra = Object.assign(
                    {},
                    newRawResult.data.extra,
                    snippet.extra,
                  );

                  const newResult = new this.constructor(newRawResult);
                  newResult.actions = this.actions;
                  this.actions.replaceResult(this, newResult);
                })
                .catch(console.error);
            }
          });
          result.actions = this.actions;
          return result;
        });
    }
    return this._shareLocationButtons;
  }

  get localResult() {
    const extra = this.rawResult.data.extra || {};
    if (!extra.address && !extra.phonenummber) {
      return null;
    }
    return new LocalResult({
      address: extra.address,
      phoneNumber: extra.phonenumber,
      mapUrl: extra.mu,
      mapImg: extra.map_img
    });
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
      ...(this.shareLocationButtons),
      ...(this.newsResults).slice(0, 3),
      ...(this.videoResults).slice(0, 3),
      ...this.internalResults.slice(0, this.internalResultsLimit),
    ];
  }

  get allResults() {
    return [
      ...this.selectableResults,
      ...this.imageResults,
      ...this.anchorResults,
      ...(this.localResult ? this.localResult.internalResults : []),
    ];
  }

  findResultByUrl(href) {
    return this.allResults.find(r => equals(r.url, href) || equals(r.rawUrl, href));
  }

  hasUrl(href) {
    return Boolean(this.findResultByUrl(href));
  }

  get isHistory() {
    return this.kind[0] === 'H';
  }

  get isDeletable() {
    return this.isHistory;
  }

  click(window, href, ev) {
    if (equals(href, this.url)) {
      events.pub('ui:click-on-url', {
        url: href,
        query: this.query,
      });
      // TODO: do not use global
      /* eslint-disable */
      window.CLIQZ.Core.urlbar.value = href;
      /* eslint-enable */

      const newTab = ev.altKey || ev.metaKey || ev.ctrlKey || ev.button === 1;
      if (!newTab) {
        // delegate to Firefox for full set of features like switch-to-tab
        window.CLIQZ.Core.urlbar.handleCommand(ev, 'current');
      } else {
        utils.openLink(window, this.rawUrl, true, false, false, false);
      }
    } else {
      this.findResultByUrl(href).click(window, href, ev);
    }
  }

  /*
   * Lifecycle hook
   */
  didRender(...args) {
    const allButThisResult = this.allResults.slice(1);
    allButThisResult.forEach(result => result.didRender(...args));
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

class LocalInfoResult extends BaseResult {
  get mapImg() {
    return this.rawResult.mapImg;
  }
}

class AnchorResult extends BaseResult {
}

class LocalResult extends BaseResult {
  get address() {
    return this.rawResult.address || {};
  }

  get phoneNumber() {
    return this.rawResult.phoneNumber || {};
  }

  get mapImg() {
    return this.rawResult.mapImg || {};
  }

  get mapUrl() {
    return this.rawResult.mapUrl || {};
  }

  get internalResults() {
    if (!this.mapUrl || !this.mapImg) {
      return [];
    }
    return [new LocalInfoResult({
      url: this.mapUrl,
      title: 'show-map',
      text: this.query,
      mapImg: this.mapImg,
    })];
  }
}

class ShareLocationButton extends BaseResult {

  get elementId() {
    if (!this._elementId) {
      const id = Math.floor(Math.random() * 1000);
      this._elementId = `result-share-location-${id}`;
    }
    return this._elementId;
  }

  get displayUrl() {
    return this.rawResult.text;
  }

  get className() {
    return this.rawResult.className;
  }

  get elementClassName() {
    return this.rawResult.className;
  }

  didRender(dropdownElement) {
    this.element = dropdownElement.querySelector(`#${this.elementId}`);
    this.spinner = dropdownElement.ownerDocument.createElement('div');
    this.spinner.className = 'spinner';
  }

  click(window, href) {
    this.element.appendChild(this.spinner);

    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    const locationAssistant = this.actions.locationAssistant;
    const actionName = action.actionName;
    if (!locationAssistant.hasAction(actionName)) {
      return;
    }
    locationAssistant[actionName]().then(() => {
      this.rawResult.onButtonClick();
    }).catch(console.error);
  }
}
