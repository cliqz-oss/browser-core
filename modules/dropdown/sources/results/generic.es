import utils from '../../core/utils';
import console from '../../core/console';

import BaseResult, { getDeepResults } from './base';
import LocalResult, { ShareLocationButton } from './local';
import { OfferResult } from './offer';
import NewsResult from './news';
import VideoResult from './video';

class ImageResult extends BaseResult {
  get thumbnail() {
    return this.rawResult.thumbnail;
  }
}

class InternalResult extends BaseResult {
}

class SocialResult extends BaseResult {
}

class AnchorResult extends BaseResult {
}

export default class GenericResult extends BaseResult {
  constructor(rawResult, allResultsFlat, { offers } = {}) {
    super(rawResult, allResultsFlat);
    this.internalResultsLimit = 4;

    if (offers) {
      this.offerStyle = offers.organicStyle;
      this.offerEnabled = offers.isEnabled;
      this.offerLocationEnabled = offers.locationEnabled;
    }
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

  get socialResults() {
    const deepLinks = getDeepResults(this.rawResult, 'social');

    return deepLinks.map(({ url, image }) => new SocialResult({
      url,
      image,
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
      domain: extra.domain,
      title,
      thumbnail: extra.thumbnail,
      description: extra.description,
      creation_time: extra.creation_timestamp,
      tweet_count: extra.tweet_count,
      showLogo: this.url && (
        utils.getDetailsFromUrl(this.url).domain !==
        utils.getDetailsFromUrl(url).domain
      ),
      text: this.query,
    }));
  }

  get videoResults() {
    const deepLinks = getDeepResults(this.rawResult, 'videos');
    return deepLinks.map(({ url, title, extra }) => new VideoResult({
      url,
      title,
      thumbnail: extra.thumbnail,
      duration: extra.duration,
      views: extra.views,
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

  get selectableResults() {
    return [
      ...super.selectableResults,
      ...(this.shareLocationButtons),
      ...(this.newsResults).slice(0, 3),
      ...(this.videoResults).slice(0, 3),
      ...this.internalResults.slice(0, this.internalResultsLimit),
    ];
  }

  get allResults() {
    return [
      ...super.allResults,
      ...this.socialResults,
      ...this.imageResults,
      ...this.anchorResults,
      ...(this.localResult ? [...this.localResult.allResults] : []),
      ...(this.offerResult ? [...this.offerResult.allResults] : []),
    ];
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

                  const newResult = new this.constructor(newRawResult, [], {
                    offers: {
                      isEnabled: this.offerEnabled,
                      organicStyle: this.offerStyle,
                    }
                  });
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

    const result = new LocalResult({
      extra,
      text: this.query,
    });

    result.actions = this.actions;
    return result;
  }

  get offerResult() {
    const extra = this.rawResult.data.extra || {};
    const offerData = extra.offers_data || {};
    if (this.isAd || !offerData.is_injected || !this.offerEnabled) {
      return null;
    }

    const result = new OfferResult({
      offerData,
      showThumbnail: this.offerStyle === 'rich',
      text: this.query,
    });

    result.actions = this.actions;
    return result;
  }
}
