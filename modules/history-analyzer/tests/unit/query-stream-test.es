/* global chai */
/* global describeModule */

const adblocker = require('@cliqz/adblocker');
const moment = require('moment');
const tldts = require('tldts');
const punycode = require('punycode');

const mockDexie = require('../../core/unit/utils/dexie');

export default describeModule('history-analyzer/query-stream',
  () => ({
    'platform/lib/adblocker': {
      default: adblocker,
    },
    'platform/lib/tldts': tldts,
    ...mockDexie,
    'platform/lib/moment': {
      default: moment,
    },
    'platform/url': {
      default: '[dynamic]',
    },
    'core/LRU': {
      default: class {
        get() { }

        set() {}
      },
    },
    'core/platform': {
    },
    'core/assert': {
      default() {},
    },
    'core/console': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
    'core/events': {
      default: {
        subscribe() { return { unsubscribe() {} }; }
      },
    },
    'core/helpers/md5': {},
    'history-analyzer/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
    'platform/lib/punycode': {
      default: punycode,
    },
  }),
  () => {
    let extractQueryFromUrl;
    let queries;

    beforeEach(function () {
      extractQueryFromUrl = this.module().extractQueryFromUrl;
      const QueryStream = this.module().default;
      queries = new QueryStream(
        { on() {} }, // historyProcessor
        { on() {} }, // historyStream
      );
      return queries.init();
    });

    afterEach(() => queries.destroy());

    describe('#extractQueryFromUrl', () => {
      const cases = [
        { url: 'https://www.google.de/search?q=foo&ie=utf-8', query: 'foo', source: 'google' },
        { url: 'https://www.google.com/search?q=foo&ie=utf-8', query: 'foo', source: 'google' },
        { url: 'https://duckduckgo.com/?q=foo&t=hg&ia=web', query: 'foo', source: 'duckduckgo' },
        { url: 'https://duckduckgo.com/?q=foo&t=hg&ia=web', query: 'foo', source: 'duckduckgo' },
        { url: 'https://www.bing.com/search?q=foo&go=Submit+Query&qs=ds&form=QBLH', query: 'foo', source: 'bing' },
        { url: 'https://search.yahoo.com/yhs/search?p=foo&ei=UTF-8&hspart=mozilla&hsimp=yhs-002', query: 'foo', source: 'yahoo' },
        { url: 'https://www.amazon.com/s?ie=UTF8&field-keywords=foo&index=blended&link_code=qs&sourceid=Mozilla-search&tag=mozilla-20', query: 'foo', source: 'amazon' },
        { url: 'https://www.ecosia.org/search?q=foo&ref=cliqz', query: 'foo', source: 'ecosia' },
        { url: 'https://www.startpage.com/do/dsearch?query=foo&cat=web&pl=opensearch&language=english', query: 'foo', source: 'startpage' },
        { url: 'https://twitter.com/search?q=foo&partner=Firefox&source=desktop-search', query: 'foo', source: 'twitter' },
        { url: 'https://www.youtube.com/results?search_query=foo', query: 'foo', source: 'youtube' },
        { url: 'https://www.qwant.com/?q=foo&client=opensearch', query: 'foo', source: 'qwant' },
      ];

      cases.forEach(({ url, query, source }) => {
        it(`extracts query from ${source}`, () =>
          chai.expect(extractQueryFromUrl(url)).to.be.eql({ query, source }));
      });
    });

    describe('#handleNewVisit', () => {
    });

    describe('#deleteDataOlderThan', () => {
    });
  });
