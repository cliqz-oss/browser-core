import OfferJob from './job';

export default class Shuffle extends OfferJob {
  constructor() {
    super('Shuffle');
  }

  // Fisher–Yates shuffle, https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
  static process(offerList) {
    const ls = [...offerList];
    for (let i = offerList.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = ls[i];
      ls[i] = ls[j];
      ls[j] = tmp;
    }
    return ls;
  }
}
