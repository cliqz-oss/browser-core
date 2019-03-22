import URL from '../../core/fast-url-parser';
import { cleanMozillaActions, urlStripProtocol } from '../../core/content/url';
import BaseResult, { Subresult } from './base';
import LocalResult, { ShareLocationButton } from './local';
import { OfferResult } from './offer';
import NewsResult from './news';
import VideoResult from './video';
import {
  ANCHOR_RESULT,
  IMAGE_RESULT,
  INTERNAL_RESULT,
  SOCIAL_RESULT,
} from '../result-types';

function getDeepResults(rawResult, type) {
  const deepResults = (rawResult.data && rawResult.data.deepResults) || [];
  const deepResultsOfType = deepResults.find(dr => dr.type === type) || {
    links: [],
  };
  return deepResultsOfType.links || [];
}

class ImageResult extends Subresult {
  type = IMAGE_RESULT;

  get thumbnail() {
    return this.rawResult.thumbnail;
  }
}

class InternalResult extends Subresult {
  type = INTERNAL_RESULT;
}

class SocialResult extends Subresult {
  type = SOCIAL_RESULT;
}

class AnchorResult extends Subresult {
  type = ANCHOR_RESULT;
}

export default class GenericResult extends BaseResult {
  constructor(rawResult, resultTools) {
    super(rawResult, resultTools);
    this.internalResultsLimit = 4;

    this.topResultProps = {
      kind: rawResult.kind,
      type: rawResult.type,
      provider: rawResult.provider
    };

    const offers = this.resultTools.assistants.offers;
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

    return deepLinks.map(({ url, title, meta }) => new InternalResult(this, {
      ...this.topResultProps,
      url,
      title,
      text: this.query,
      meta,
    }));
  }

  get socialResults() {
    const deepLinks = getDeepResults(this.rawResult, 'social');

    return deepLinks.map(({ url, image }) => new SocialResult(this, {
      ...this.topResultProps,
      url,
      image,
      text: this.query,
    }));
  }

  get imageResults() {
    const deepLinks = getDeepResults(this.rawResult, 'images');
    return deepLinks.map(({ image, extra }) => new ImageResult(this, {
      ...this.topResultProps,
      url: (extra && extra.original_image) || image,
      thumbnail: image,
      text: this.query,
    }));
  }

  get anchorResults() {
    const deepLinks = getDeepResults(this.rawResult, 'simple_links');
    return deepLinks.map(({ url, title }) => new AnchorResult(this, {
      ...this.topResultProps,
      url,
      title,
      text: this.query,
    }));
  }

  get newsResults() {
    const deepLinks = getDeepResults(this.rawResult, 'news');
    const hostname = this.url
      && urlStripProtocol(new URL(cleanMozillaActions(this.url)[1]).hostname);
    return deepLinks.map(({ url, title, extra = {} } = {}) => new NewsResult(this, {
      ...this.topResultProps,
      url,
      domain: extra.domain,
      title,
      thumbnail: extra.thumbnail,
      description: extra.description,
      creation_time: extra.creation_timestamp,
      tweet_count: extra.tweet_count,
      showLogo: hostname && hostname !== urlStripProtocol(new URL(url).hostname),
      text: this.query,
      isBreakingNews: extra.breaking,
    }));
  }

  get videoResults() {
    const deepLinks = getDeepResults(this.rawResult, 'videos');
    return deepLinks.map(({ url, title, extra }) => new VideoResult(this, {
      ...this.topResultProps,
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
    return (extra.no_location || false) && this.resultTools.assistants.location.isAskingForLocation;
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
    const locationAssistant = this.resultTools.assistants.location;

    if (!this._shareLocationButtons) {
      this._shareLocationButtons = !this.isAskingForLocation ? []
        : locationAssistant.actions.map((action) => {
          let additionalClassName = '';
          if (action.actionName === 'allowOnce') {
            additionalClassName = 'location-allow-once';
          } else if (action.actionName === 'allow') {
            additionalClassName = 'location-always-show';
          }

          const result = new ShareLocationButton(this, {
            title: action.title,
            url: `cliqz-actions,${JSON.stringify({ type: 'location', actionName: action.actionName })}`,
            text: this.rawResult.text,
            className: additionalClassName,
            onButtonClick: (actionName) => {
              locationAssistant[actionName](this.query, this.rawResult)
                .then(({ snippet, locationState }) => {
                  const newRawResult = Object.assign({}, this.rawResult);
                  newRawResult.data.extra = Object.assign(
                    {},
                    newRawResult.data.extra,
                    snippet.extra,
                  );

                  // Update Location assistante state
                  Object.assign(this.resultTools.assistants.location, locationState);

                  const newResult = new this.constructor(newRawResult, this.resultTools);
                  this.resultTools.actions.replaceResult(this, newResult);
                });
            }
          });

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

    return new LocalResult(this, {
      extra,
      text: this.query,
    });
  }

  get offerResult() {
    if (this._offerResult) {
      return this._offerResult;
    }

    const extra = this.rawResult.data.extra || {};
    const offerData = extra.offers_data || {};

    if (this.isAd || !offerData.is_injected) {
      return null;
    }

    const result = new OfferResult(this, {
      offerData,
      showThumbnail: this.offerStyle === 'rich',
      text: this.query,
    });

    this._offerResult = result;

    return result;
  }
}
