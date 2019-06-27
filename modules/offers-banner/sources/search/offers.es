class OfferResult {
  constructor(rawResult, allResults) {
    this.rawResult = rawResult;
    this.allResults = allResults;
  }

  // Index is only important to report standalone offers
  get index() {
    return this.allResults
      .filter(r => r.provider === 'cliqz' || r.provider === 'cliqz::offers')
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
    return this.offerData.offer_id;
  }

  get offerData() {
    const offerData = this._extra.offers_data || {};
    return offerData.data;
  }
}

export default class OffersReporter {
  constructor(offersV2) {
    this.offersV2 = offersV2;
    this.offerSignalSent = new Set();
  }

  registerResults() {
    this.offerSignalSent.clear();
  }

  /**
   * @private
   */
  hasSentTelemetry(offerId) {
    return this.offerSignalSent.has(offerId);
  }

  async notifyThatOfferExists(offer) {
    await this.offersV2.action('createExternalOffer', {
      origin: 'dropdown',
      data: offer.offerData,
    });
    this.offerSignalSent.add(offer.offerId);
  }

  /**
   * @private
   */
  report(offerId, actionId, { ctaUrl } = {}) {
    this.offersV2.action('processRealEstateMessage', {
      origin: 'dropdown',
      type: 'offer-action-signal',
      data: {
        offer_id: offerId,
        action_id: actionId,
        ctaUrl,
      },
    });
  }

  reportShows(results) {
    const report = async (offer) => {
      await this.notifyThatOfferExists(offer);

      const { offerId, index, hasOffer } = offer;
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

    return Promise.all(
      results
        .map(r => new OfferResult(r, results))
        .filter(r => r.shouldCountShowStats)
        .filter(r => !this.hasSentTelemetry(r.offerId))
        .map(report)
    );
  }

  async reportClick(results, clickedResult) {
    const offerResult = new OfferResult(clickedResult, results);
    if (!offerResult.isOffer) {
      return;
    }

    const { offerId, shouldCountStats, isAttached } = offerResult;
    if (!shouldCountStats) {
      return;
    }

    if (!this.hasSentTelemetry(offerId)) {
      await this.notifyThatOfferExists(offerResult);
    }

    let position = results
      .filter(r => r.provider === 'cliqz' || r.provider === 'cliqz::offers')
      .findIndex(r => r.url === clickedResult.url);
    position += 1;

    this.report(offerId, 'offer_ca_action', { ctaUrl: clickedResult.url });

    if (isAttached) {
      this.report(offerId, 'offer_ca_action_attached');
    } else {
      this.report(offerId, `offer_ca_action_${position}`);
    }
  }
}
