/* global chai, describeModule */

const createVisit = (title, url, baseUrl, host, sessionId) =>
  ({ title, url, baseUrl, host, sessionId });

export default describeModule('history/helpers',
  function () {
    return {
      '../core/url-info': {
        URLInfo: {
          get: function (url) {
            return { hostname: url.split('//')[1].split(/(?:\?|\/)/)[0] };
          }
        }
      },
    };
  },
  function () {
    let worthShowing;
    let createHistoryCluster;
    let createClusterSessions;
    let getParamFromUrl;

    beforeEach(function () {
      worthShowing = this.module().worthShowing;
      createHistoryCluster = this.module().createHistoryCluster;
      createClusterSessions = this.module().createClusterSessions;
      getParamFromUrl = this.module().getParamFromUrl;
    });

    describe('#worthShowing test falsy values', function () {
      [
        ['visit -> null', null, false],
        ['visit -> undefined', undefined, false],
        ['visit -> 0', 0, false],
        ['visit -> ""', '', false],
        ['visit -> NaN', NaN, false],
        ['visit -> false', false, false],
      ].forEach(([explain, param, expected]) => {
        it(explain, () => {
          chai.expect(worthShowing(param)).equal(expected);
        });
      });
    });

    describe('#worthShowing test some truthy values', function () {
      [
        ['visit -> 1', 1, false],
        ['visit -> " "', ' ', false],
        ['visit -> {}', {}, false],
        ['visit -> function', (function () {}), false],
        ['visit -> []', [], false],
        ['visit -> {title: "Test Visit"}', { title: 'Test Visit' }, false],
      ].forEach(([explain, param, expected]) => {
        it(explain, () => {
          chai.expect(worthShowing(param)).equal(expected);
        });
      });
    });

    describe('#worthShowing test visit inconsistency', function () {
      [
        ['visit -> title not string', { title: 1 }, false],
        ['visit -> url not string', { url: 1 }, false],
        ['visit -> baseUrl not string', { baseUrl: 1 }, false],
        ['visit -> host not string', { host: 1 }, false],
      ].forEach(([explain, param, expected]) => {
        it(explain, () => {
          chai.expect(worthShowing(param)).equal(expected);
        });
      });
    });

    describe('#worthShowing test visit empty title', function () {
      [
        ['visit -> title is empty', { title: '' }, false],
      ].forEach(([explain, param, expected]) => {
        it(explain, () => {
          chai.expect(worthShowing(param)).equal(expected);
        });
      });
    });

    describe('#worthShowing test visit url against SHORTENERS Set', function () {
      [
        ['visit -> url belongs to SHORTENERS, with query params, worth not showing', {
          title: 'Test Title',
          url: 'https://tinyurl.com?q=vasya',
          baseUrl: 'tinyurl.com/?q=vasya',
          host: 'tinyurl.com',
        }, false],
      ].forEach(([explain, param, expected]) => {
        it(explain, () => {
          chai.expect(worthShowing(param)).equal(expected);
        });
      });
    });

    describe('#worthShowing test visit url against SHORTENERS Set', function () {
      [
        ['visit -> url does not belong to SHORTENERS, with query params, worth showing', {
          title: 'Test Title',
          url: 'https://not-shortener.com/?q=tinyurl.com&param=vasya',
          baseUrl: 'not-shortener.com/?q=tinyurl.com&param=vasya',
          host: 'not-shortener.com',
        }, true],
      ].forEach(([explain, param, expected]) => {
        it(explain, () => {
          chai.expect(worthShowing(param)).equal(expected);
        });
      });
    });

    describe('#worthShowing test visit url against SHORTENERS Set', function () {
      [
        ['visit -> url belongs to SHORTENERS, without query params, worth showing', {
          title: 'Test Title',
          url: 'https://zii.bz',
          baseUrl: 'zii.bz/',
          host: 'zii.bz',
        }, true],
      ].forEach(([explain, param, expected]) => {
        it(explain, () => {
          chai.expect(worthShowing(param)).equal(expected);
        });
      });
    });

    // ////////////////////////////////////////////////////////////////////////////////////
    describe('#createHistoryCluster test empty array', function () {
      it('history -> []', () => {
        chai.expect(createHistoryCluster([])).to.deep.equal([]);
      });
    });

    describe('#createHistoryCluster test visits with sessionId worth(not) showing mixed', function () {
      const v4 = createVisit('Title | Not Worth Showing', 'https://shorter.is?q=SomeQuery', 'shorter.is?q=SomeQuery', 'shorter.is', 5);
      const v6 = createVisit('Title | Worth Showing', 'https://deal-with.com?q=12', 'deal-with.com?q=12', 'deal-with.com', 4);
      const v8 = createVisit('Title | Worth Showing', 'https://tic-key.com', 'tic-key.com/', 'tic-key.com', 4);
      const v7 = createVisit('Title | Worth Not Showing', 'https://u.to?p=1', 'u.to?p=1', 'u.to', 3);
      const v2 = createVisit('Title | Worth Showing', 'https://urlways.com', 'https://urlways.com/', 'https://urlways.com', 2);
      const v5 = createVisit('Title | Worth Showing', 'https://domain.com', 'domain.com/', 'domain.com', 2);
      const v1 = createVisit('Title | Worth Showing', 'https://qr.net', 'qr.net/', 'qr.net', 1);
      const v3 = createVisit('', 'https://shorter.is', 'shorter.is/', 'shorter.is', 1);

      const arr = [v1, v2, v3, v4, v5, v6, v7, v8];
      it(`history -> ${JSON.stringify(arr)}`, () => {
        chai.expect(createHistoryCluster(arr)).to.deep.equal([
          [v4, { isVisible: true, ...v6 }],
          [{ isVisible: true, ...v8 }],
          [v7, { isVisible: true, ...v2 }],
          [{ isVisible: true, ...v5 }],
          [{ isVisible: true, ...v1 }],
          [v3]
        ]);
      });
    });

    // ////////////////////////////////////////////////////////////////////////////////////
    describe('#createClusterSessions test empty cluster', function () {
      it('cluster -> []', () => {
        chai.expect(createClusterSessions([])).to.deep.equal([]);
      });
    });

    describe('#createClusterSessions one empty item in cluster', function () {
      it('cluster -> [[]]', () => {
        chai.expect(createClusterSessions([[]])).to.deep.equal([[]]);
      });
    });

    describe('#createClusterSessions one item in cluster', function () {
      it('cluster -> [[{sessionId: 1}]]', () => {
        chai.expect(createClusterSessions([[{ sessionId: 1 }]]))
          .to.deep.equal([[{ sessionId: 1 }]]);
      });
    });

    describe('#createClusterSessions many items in cluster', function () {
      const cluster = [
        [
          { sessionId: 1 }, { sessionId: 1 }, { sessionId: 1 }
        ],
        [
          { sessionId: 1 }, { sessionId: 2 }, { sessionId: 2 }
        ],
        [
          { sessionId: 3 }, { sessionId: 3 }, { sessionId: 4 }
        ],
        [
          { sessionId: 4 }, { sessionId: 5 }
        ],
      ];
      it(`cluster -> ${JSON.stringify(cluster)}`, () => {
        chai.expect(createClusterSessions(cluster)).to.deep.equal([
          [
            { sessionId: 1 }, { sessionId: 1 }, { sessionId: 1 }, { sessionId: 1 }
          ],
          [
            { sessionId: 2 }, { sessionId: 2 }
          ],
          [
            { sessionId: 3 }, { sessionId: 3 }
          ],
          [
            { sessionId: 4 }, { sessionId: 4 }
          ],
          [
            { sessionId: 5 }
          ],
        ]);
      });
    });

    // ////////////////////////////////////////////////////////////////////////////////////
    describe('#getParamFromUrl test falsy values', function () {
      [
        ['url,param -> null', null, null, ''],
        ['url,param -> undefined', undefined, undefined, ''],
        ['url,param -> 0', 0, 0, ''],
        ['url,param -> ""', '', '', ''],
        ['url,param -> NaN', NaN, NaN, ''],
        ['url,param -> false', false, false, ''],
      ].forEach(([explain, url, param, expected]) => {
        it(explain, () => {
          chai.expect(getParamFromUrl(url, param)).equal(expected);
        });
      });
    });

    describe('#getParamFromUrl test without query params', function () {
      [
        ['url,param -> null', 'domain.com', null, ''],
        ['url,param -> undefined', 'domain.com', undefined, ''],
        ['url,param -> 0', 'domain.com', 0, ''],
        ['url,param -> ""', 'domain.com', '', ''],
        ['url,param -> NaN', 'domain.com', NaN, ''],
        ['url,param -> false', 'domain.com', false, ''],
      ].forEach(([explain, url, param, expected]) => {
        it(explain, () => {
          chai.expect(getParamFromUrl(url, param)).equal(expected);
        });
      });
    });

    describe('#getParamFromUrl test bad GET query params delimiter', function () {
      [
        ['url,param -> ?q?q=12', 'domain.com?q?q=12', 'q', ''],
        ['url,param -> ?q=12?k=10', 'domain.com?q=12?k=10', 'q', '12'],
        ['url,param -> ?q=1?q=2?q=3', 'domain.com?q=1?q=2?q=3', 'q', '1'],
        ['url,param -> domain.com???', 'domain.com???', 'q', ''],
        ['url,param -> domain.com? ?', 'domain.com? ?', 'q', ''],
      ].forEach(([explain, url, param, expected]) => {
        it(explain, () => {
          chai.expect(getParamFromUrl(url, param)).equal(expected);
        });
      });
    });

    describe('#getParamFromUrl test bad GET param tokens delimiter', function () {
      [
        ['url,param -> ?q=12&&23&', 'domain.com?q=12&&23&', 'q', '12'],
        ['url,param -> ?q=&q=1&&', 'domain.com?q=&q=1&&', 'q', ''],
        ['url,param -> ?&q=15', 'domain.com?&q=15', 'q', '15'],
        ['url,param -> ?&&', 'domain.com?&&', 'q', ''],
        ['url,param -> ?q=12&q=15&q=17', 'domain.com?q=12&q=15&q=17', 'q', '12'],
      ].forEach(([explain, url, param, expected]) => {
        it(explain, () => {
          chai.expect(getParamFromUrl(url, param)).equal(expected);
        });
      });
    });

    describe('#getParamFromUrl test GET params decodeURIComponent', function () {
      [
        ['url,param -> ?q?q=12', 'domain.com?q=%26', 'q', '&'],
        ['url,param -> ?q=1?q=2?q=3', 'domain.com?q=%3Cscript%3E', 'q', '<script>'],
        ['url,param -> domain.com???', 'domain.com?q=%de', 'q', ''],
        ['url,param -> domain.com???', 'domain.com?q=%AAAd4sdfdf', 'q', ''],
        ['url,param -> domain.com? ?', 'domain.com?q=domain.com%3Fq', 'q', 'domain.com?q'],
      ].forEach(([explain, url, param, expected]) => {
        it(explain, () => {
          chai.expect(getParamFromUrl(url, param)).equal(expected);
        });
      });
    });
  });
