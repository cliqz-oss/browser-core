import BaseResult from './base';
import utils from '../../core/utils';

class TextResult extends BaseResult {

  click(window, href, ev) {
    this.actions.copyToClipboard(this.rawResult.title);
    const el = ev.target;
    el.classList.add('copied');

    const signal = {
      type: 'offrz',
      action: 'click',
      view: 'search',
      target: 'copy',
    };

    utils.telemetry(signal);
  }
}

export class OfferResult extends BaseResult {
  get _offerData() {
    return this.rawResult.offerData;
  }

  get offerSource() {
    if (!this._offerData.is_injected) {
      return null;
    }

    return new BaseResult({
      url: this._offerData.url_ad,
      title: this._offerData.title,
      text: this.rawResult.text,
    });
  }

  get thumbnail() {
    return this._offerData.thumbnail;
  }

  get showThumbnail() {
    return this.rawResult.showThumbnail;
  }

  get promoCode() {
    const result = new TextResult({
      url: `cliqz-actions,${JSON.stringify({ type: 'offer', actionName: 'copy' })}`,
      text: this.rawResult.text,
      title: this._offerData.promo_code,
    });
    result.actions = this.actions;

    return result;
  }

  get allResults() {
    return [
      this.promoCode,
      ...(this.offerSource ? [this.offerSource] : []),
    ];
  }
}

export default class OffersResult extends BaseResult {

  constructor(rawResult, allResultsFlat, { offers } = {}) {
    if (!offers.isEnabled) {
      throw new Error('ignore');
    }

    super(rawResult, allResultsFlat);

    this.style = offers.nonOrganicStyle;
  }

  get template() {
    return this.style === 'rich' ? 'offer' : 'generic';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get displayUrl() {
    return this.url;
  }

  get friendlyUrl() {
    const urlDetails = utils.getDetailsFromUrl(this.url);
    return urlDetails.friendly_url;
  }

  get _offerData() {
    return this._extra.offers_data || {};
  }

  get offerResult() {
    if (this.style !== 'rich') {
      return null;
    }

    const result = new OfferResult({
      offerData: this._offerData,
      text: this.query,
    });

    result.actions = this.actions;

    return result;
  }

  get allResults() {
    return [
      ...super.selectableResults,
      ...(this.offerResult ? this.offerResult.allResults : []),
    ];
  }
}
