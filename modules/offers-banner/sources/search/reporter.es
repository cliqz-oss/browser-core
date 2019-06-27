import prefs from '../../core/prefs';
import OffersReporter from './offers';

export default class SearchReporter {
  constructor(offersV2) {
    this.currentResults = null;
    this.offersReporter = new OffersReporter(offersV2);
  }

  get inOffersAB() {
    return prefs.get('offers2UserEnabled', true);
  }

  async onSearchResultClick({ rawResult }) {
    if (!this.inOffersAB) {
      return;
    }

    if (
      this.currentResults && this.currentResults[0]
      && (rawResult.text === this.currentResults[0].text)
    ) {
      await this.offersReporter.reportShows(this.currentResults);
    }

    this.offersReporter.reportClick(this.currentResults, rawResult);
  }

  onSearchSessionEnd() {
    if (
      !this.inOffersAB
      || !this.currentResults
    ) {
      return;
    }

    this.offersReporter.reportShows(this.currentResults);
  }

  onSearchResults(results) {
    if (!this.inOffersAB) {
      return;
    }

    this.currentResults = results.results;
    this.offersReporter.registerResults(results.results);
  }
}
