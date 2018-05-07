import BaseResult, { Subresult } from './base';

class TextResult extends Subresult {
  click(href, ev) {
    this.resultTools.actions.copyToClipboard(this.rawResult.title);
    const el = ev.target;
    el.classList.add('copied');

    const signal = {
      type: 'offrz',
      action: 'click',
      view: 'search',
      target: 'copy',
    };

    this.resultTools.actions.telemetry(signal);
  }
}

export class OfferResult extends Subresult {
  get _offerData() {
    return this.rawResult.offerData;
  }

  get offerSource() {
    if (!this._offerData.is_injected) {
      return null;
    }

    return new Subresult(this, {
      url: this._offerData.url_ad,
      title: this._offerData.title,
      description: this._offerData.description,
      text: this.rawResult.text,
      data: {
        extra: {
          offers_data: this._offerData,
          is_injected_ad: true,
        },
      },
    });
  }

  get thumbnail() {
    return this._offerData.thumbnail;
  }

  get showThumbnail() {
    return this.rawResult.showThumbnail;
  }

  get promoCode() {
    const result = new TextResult(this, {
      url: `cliqz-actions,${JSON.stringify({ type: 'offer', actionName: 'copy' })}`,
      text: this.rawResult.text,
      title: this._offerData.promo_code,
    });

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
  constructor(rawResult, resultTools) {
    const offers = resultTools.assistants.offers;

    if (!offers.isEnabled) {
      throw new Error('ignore');
    }

    super(rawResult, resultTools);

    this.style = offers.nonOrganicStyle;
    this.locationEnabled = offers.locationEnabled;
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
    return this.rawResult.friendlyUrl || this.url;
  }

  get _offerData() {
    return this._extra.offers_data || {};
  }

  get offerResult() {
    if (this.style !== 'rich') {
      return null;
    }

    const result = new OfferResult(this, {
      offerData: this._offerData,
      text: this.query,
    });

    return result;
  }

  get allResults() {
    return [
      ...super.selectableResults,
      ...(this.offerResult ? this.offerResult.allResults : []),
    ];
  }
}
