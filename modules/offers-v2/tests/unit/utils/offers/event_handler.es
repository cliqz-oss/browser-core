let UrlData;
let CategoriesMatchTraits;

async function init(system) {
  UrlData = (await system.import('offers-v2/common/url_data')).default;
  CategoriesMatchTraits = (await system.import('offers-v2/categories/category-match')).CategoriesMatchTraits;
}

const buildUrlData = (url, referrer, activeCats = new Set()) => {
  const urlData = new UrlData(url, referrer);
  const matchPatterns = new Map(
    Array.from(activeCats.keys(), k => [k, [{ rawPattern: 'SomeMatchPattern', tokenCount: 1 }]])
  );
  const matches = new CategoriesMatchTraits(matchPatterns);
  urlData.setCategoriesMatchTraits(matches);
  return urlData;
};

class EventHandlerMock {
  constructor() {
    this.httpMap = new Map();
    this.urlMap = new Map();
  }

  isHttpReqDomainSubscribed(cb, dom) {
    return this.httpMap.has(dom) && this.httpMap.get(dom).has(cb);
  }

  subscribeHttpReq(cb, domainName) {
    if (!this.httpMap.has(domainName)) {
      this.httpMap.set(domainName, new Set());
    }
    this.httpMap.get(domainName).add(cb);
  }

  unsubscribeHttpReq(cb, domainName) {
    if (this.httpMap.has(domainName)) {
      this.httpMap.get(domainName).delete(cb);
    }
  }

  subscribeUrlChange(cb, cargs = null) {
    this.urlMap.set(cb, cargs);
  }

  unsubscribeUrlChange(cb) {
    this.urlMap.delete(cb);
  }

  simUrlChange(url, ref) {
    this.urlMap.forEach((cargs, cb) => cb(buildUrlData(url, ref), cargs));
  }

  simWebRequest(url, ref) {
    // need to get domain here
    const urlData = buildUrlData(url, ref);
    const domain = urlData.getDomain();
    if (this.httpMap.has(domain)) {
      this.httpMap.get(domain).forEach(cb => cb({ url_data: urlData }));
    }
  }
}

module.exports = {
  'offers-v2/event_handler': {
    default: EventHandlerMock,
    buildUrlData,
    init,
  },
};
