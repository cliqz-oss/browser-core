/**
 * Notify `JourneyCollector` about a new page in user journey.
 *
 * @class NewPage
 */
export default class NewPage {
  constructor(eventHandler, journeyCollector) {
    this.eventHandler = eventHandler;
    this.journeyCollector = journeyCollector;
    this.onUrlChange = this.onUrlChange.bind(this);
    this.domainToClass = {
      // top search engines
      'ask.com': 'search-top',
      'fireball.com': 'search-top',
      'qwant.com': 'search-top',
      'exalead.com': 'search-top',
      'gigablast.com': 'search-top',
      'duckduckgo.com': 'search-top',
      // meta search
      'metager.de': 'metasearch',
      'extraktsearch.de': 'metasearch', // LexiQuo
      'disconnect.me': 'metasearch',
      'metacrawler.de': 'metasearch',
      'metacrawler.com': 'metasearch',
      'dogpile.com': 'metasearch',
      'startpage.com': 'metasearch',
      'ecosia.org': 'metasearch',
      'hotbot.com': 'metasearch',
      'wolframalpha.com': 'metasearch',
      // special cases, rewritten to 'metasearch' in code
      't-online.de': 'portal-search',
      'web.de': 'portal-search',
      'gmx.net': 'portal-search',
    };
    // companies in several national domains
    this.companyToClass = {
      // top search engines
      google: 'search-top',
      bing: 'search-top',
      yandex: 'search-top',
      baidu: 'search-top',
      yahoo: 'search-top',
      lycos: 'search-top',
      // special domains
      amazon: 'amazon',
      ebay: 'ebay',
    };
    // when heuristics doesn't work
    this.companyToFeature = {
      ebay: 'shop',
      zalando: 'shop',
    };
  }

  init() {
    this.eventHandler.subscribeUrlChange(this.onUrlChange);
  }

  destroy() {
    this.eventHandler.unsubscribeUrlChange(this.onUrlChange);
  }

  /**
   * @method onUrlChange
   * @param {UrlData} urlData
   */
  onUrlChange(urlData) {
    if (!urlData) {
      return;
    }
    const url = urlData.getRawUrl();
    const domain = urlData.getGeneralDomain() || '';
    const company = domain.split('.')[0];
    let category = this.domainToClass[domain]
      || this.companyToClass[company]
      || 'unk';
    if (category === 'portal-search') {
      if (url.toLowerCase().includes('suche')) {
        category = 'metasearch';
      } else {
        category = 'unk';
      }
    }
    this.journeyCollector.addStep({ feature: category, url });
    const feature = this.companyToFeature[company];
    if (feature) {
      this.journeyCollector.addFeature({ feature, url });
    }
  }
}
