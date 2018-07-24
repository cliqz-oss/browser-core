import inject from '../../core/kord/inject';

export default class Cliqz {
  constructor() {
    const mobileCards = inject.module('mobile-cards');
    this.mobileCards = new Proxy({}, {
      get(target, prop) {
        return mobileCards.action.bind(mobileCards, prop);
      },
    });
    const search = inject.module('search');
    this.search = new Proxy({}, {
      get(target, prop) {
        return search.action.bind(search, prop);
      },
    });
    const geolocation = inject.module('geolocation');
    this.geolocation = new Proxy({}, {
      get(target, prop) {
        return geolocation.action.bind(geolocation, prop);
      },
    });
  }
}
