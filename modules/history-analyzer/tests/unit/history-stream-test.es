/* global chai */
/* global describeModule */

const adblocker = require('@cliqz/adblocker');
const moment = require('moment');
const tldts = require('tldts');
const punycode = require('punycode');
const mockDexie = require('../../core/unit/utils/dexie');

export default describeModule('history-analyzer/history-stream',
  () => ({
    ...mockDexie,
    'platform/lib/adblocker': {
      default: adblocker,
    },
    'platform/lib/moment': {
      default: moment,
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
    'history-analyzer/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
    'platform/lib/tldts': tldts,
    'core/platform': {},
    'platform/url': {},
    'platform/lib/punycode': {
      default: punycode,
    },
  }),
  () => {
    let history;
    let pushProcessedUrlsEvent;

    const mkHistoryProcessorMock = () => ({
      on(name, cb) {
        pushProcessedUrlsEvent = cb;
      }
    });

    beforeEach(function () {
      const HistoryStream = this.module().default;
      history = new HistoryStream(mkHistoryProcessorMock());
      return history.init();
    });

    afterEach(() => history.destroy());

    it('#handleLocationChange', () =>
      Promise.all([
        history.handleLocationChange({ isLoadingDocument: true, url: 'http://foo.com' }),
        history.handleLocationChange({ isLoadingDocument: true, url: 'http://bar.com' }),
        history.handleLocationChange({ isLoadingDocument: true, url: 'http://baz.com' }),
      ]).then(() => history.all())
        .then((urls) => {
          chai.expect(urls).to.have.length(3);
          chai.expect(urls[0].url).to.be.eql('http://foo.com');
          chai.expect(urls[0].id).to.be.eql(1);
          chai.expect(urls[1].url).to.be.eql('http://bar.com');
          chai.expect(urls[1].id).to.be.eql(2);
          chai.expect(urls[2].url).to.be.eql('http://baz.com');
          chai.expect(urls[2].id).to.be.eql(3);
        }));

    it('Receives event from history processor', () => {
      const urls = [
        { ts: 1, url: 'http://foo.com', tokens: new Uint32Array([1]) },
        { ts: 2, url: 'http://bar.com', tokens: new Uint32Array([2]) },
        { ts: 3, url: 'http://baz.com', tokens: new Uint32Array([3]) },
      ];

      return pushProcessedUrlsEvent(urls).then(() => history.all())
        .then(result => chai.expect(result).to.be.eql([
          { ...urls[0], id: 1 },
          { ...urls[1], id: 2 },
          { ...urls[2], id: 3 },
        ]));
    });

    it('#deleteDataOlderThan', () => {
      const urls = [
        { ts: 1, url: 'http://foo.com', tokens: new Uint32Array([1]) },
        { ts: 2, url: 'http://bar.com', tokens: new Uint32Array([2]) },
        { ts: 3, url: 'http://baz.com', tokens: new Uint32Array([3]) },
      ];

      return pushProcessedUrlsEvent(urls)
        .then(() => history.deleteDataOlderThan(3))
        .then(() => history.all())
        .then(result => chai.expect(result).to.be.eql([
          { ...urls[2], id: 3 },
        ]));
    });
  });
