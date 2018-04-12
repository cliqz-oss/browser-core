import prefs from '../../core/prefs';

// TODO: this module public API has to be completely covered with unit tests

class OfferResult {
  constructor(rawResult, allResults) {
    this.rawResult = rawResult;
    this.allResults = allResults;
  }

  // Index is only important to report standalone offers
  get index() {
    return this.allResults
      .filter(r => r.provider === 'cliqz')
      .findIndex(r => r.url === this.rawResult.url);
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get isAd() {
    return this._extra.is_ad;
  }

  get isAttached() {
    return this._extra.is_injected_ad;
  }

  get isOffer() {
    return this.isAd || this.isAttached;
  }

  get hasOffer() {
    const offerData = this._extra.offers_data || {};
    return offerData.is_injected;
  }

  get isHistory() {
    const kind = this.rawResult.data.kind || [''];
    return kind.some(k => k === 'H');
  }

  get shouldCountStats() {
    return this.isOffer;
  }

  get shouldCountShowStats() {
    return this.isOffer || this.hasOffer;
  }

  get offerId() {
    const offerData = (this._extra.offers_data || {}).data || {};
    const campaignId = this.isAd ? '001' : '002';
    const prefName = `myoffrz.experiments.${campaignId}`;
    const style = prefs.get(`${prefName}.style`, 'plain');
    const position = prefs.get(`${prefName}.position`, 'first');

    if (this.isAd) {
      return `${offerData.offer_id}_${campaignId}_${style}_${position}`;
    }

    return `${offerData.offer_id}_${campaignId}_${style}`;
  }

  get offerData() {
    return {
      ...this.rawResult.data.extra.offers_data.data,
      offer_id: this.offerId,
    };
  }
}

export default class OffersReporter {
  constructor(offers) {
    this.offers = offers;
    this.offerSignalSent = new WeakMap();
  }

  registerResults(results) {
    this.offerSignalSent.set(results, false);
  }

  /**
   * @private
   */
  hasSentTelemetry(results) {
    return this.offerSignalSent.get(results);
  }

  /**
   * @private
   */
  report(offerId, actionId) {
    this.offers.action('processRealEstateMessage', {
      origin: 'dropdown',
      type: 'offer-action-signal',
      data: {
        offer_id: offerId,
        action_id: actionId,
      },
    });
  }

  reportShows(results) {
    const report = async ({ offerId, offerData, index, hasOffer }) => {
      await this.offers.action('createExternalOffer', {
        origin: 'dropdown',
        data: offerData,
      });

      this.report(offerId, 'offer_dsp_session');
      this.report(offerId, 'offer_shown');

      const position = index + 1;

      if (hasOffer) {
        this.report(offerId, 'offer_dsp_session_attached');
        this.report(offerId, 'offer_shown_attached');
      } else {
        this.report(offerId, `offer_dsp_session_${position}`);
        this.report(offerId, `offer_shown_${position}`);
      }
    };

    if (this.hasSentTelemetry(results)) {
      return Promise.resolve();
    }

    this.offerSignalSent.set(results, true);

    return Promise.all(
      results
        .map(r => new OfferResult(r, results))
        .filter(r => r.shouldCountShowStats)
        .map(report)
    );
  }

  reportClick(results, clickedResult) {
    const { offerId, shouldCountStats, isAttached } = new OfferResult(clickedResult);

    if (!shouldCountStats) {
      return;
    }

    let position = results
      .filter(r => r.provider === 'cliqz')
      .findIndex(r => r.url === clickedResult.url);
    position += 1;

    this.report(offerId, 'offer_ca_action');

    if (isAttached) {
      this.report(offerId, 'offer_ca_action_attached');
    } else {
      this.report(offerId, `offer_ca_action_${position}`);
    }
  }
}
