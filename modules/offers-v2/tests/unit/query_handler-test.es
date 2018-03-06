/* global chai */
/* global describeModule */
/* global require */


const VALID_POSTING_OBJ = {};


export default describeModule('offers-v2/query_handler',
  () => ({
    'core/platform': {
      isChromium: false
    },
    'core/prefs': {
      default: {}
    },
    'core/console': {
      default: {}
    },
    'core/crypto/random': {
    },
    'core/cliqz': {
      utils: {
        setInterval() {
        },
      }
    },
    'core/helpers/timeout': {
      default: function() { const stop = () => {}; return { stop }; }
    },
    './db_helper': {
      default: class {
        constructor(db) {
          this.db = db;
        }

        saveDocData(docID, docData) {
          const self = this;
          return new Promise((resolve, reject) => {
            self.db[docID] = docData;
            resolve();
          });
        }

        getDocData(docID) {
          const self = this;
          return new Promise((resolve, reject) => {
            resolve(self.db[docID]);
          });
        }

        removeDocData(docID) {
        }
      }
    }
  }),
  () => {
    describe('query_handler', () => {
      let QueryHandler;

      beforeEach(function () {
        QueryHandler = this.module().default;
      });

      describe('#normalize', () => {
        context('invalid input', () => {
          it('no display id', () => {
            const qhandler = new QueryHandler();
            chai.expect(qhandler).to.exist;
            const nullResult = qhandler.normalize(null);
            chai.expect(nullResult).to.equal(null);
          });
          it('no url', () => {
            const qHandler = new QueryHandler();
            const noUrlResult = qHandler.normalize(null, 'testDomain');
            chai.expect(noUrlResult).to.equal(null);
          });
          it('no domain', () => {
            const qHandler = new QueryHandler();
            const noUrlResult = qHandler.normalize('url', null);
            chai.expect(noUrlResult).to.equal(null);
          });
          it('empty domain', () => {
            const qHandler = new QueryHandler();
            const noUrlResult = qHandler.normalize('url', '');
            chai.expect(noUrlResult).to.equal(null);
          });
          it('invalid url', () => {
            const qHandler = new QueryHandler();
            const noUrlResult = qHandler.normalize('{empty:wrong_url}', 'amazon');
            chai.expect(noUrlResult.origin).to.equal('amazon');
            chai.expect(noUrlResult.query).to.equal(null);
          });
          it('invalid domain', () => {
            const qHandler = new QueryHandler();
            const noUrlResult = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon-google.dede');
            chai.expect(noUrlResult).to.equal(null);
          });
        });

        context('valid input', () => {
          it('query:fire, origin:amazon', () => {
            const qHandler = new QueryHandler();
            const UrlResult = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon.de');
            chai.expect(UrlResult.origin).to.equal('amazon');
            chai.expect(UrlResult.query).to.equal('fire');
          });
          it('query:Fir&E, origin:amazon', () => {
            const qHandler = new QueryHandler();
            const UrlResult = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon.de');
            chai.expect(UrlResult.origin).to.equal('amazon');
            chai.expect(UrlResult.query).to.equal('fire');
          });
          it('query:Ma&pS, origin:google', () => {
            const qHandler = new QueryHandler();
            const UrlResult = qHandler.normalize('https://www.google.de/?gws_rd=ssl#q=maps', 'google.de');
            chai.expect(UrlResult.origin).to.equal('google');
            chai.expect(UrlResult.query).to.equal('maps');
          });
          it('query:Micro$soft, origin:bing', () => {
            const qHandler = new QueryHandler();
            const noUrlResult = qHandler.normalize('http://www.bing.com/search?q=Micro%24soft&qs=n&form=QBLH&sp=-1&pq=micro%24soft&sc=9-10&sk=&cvid=0E20B4A87C964D5A92CE57599D028EBB', 'bing.com');
            chai.expect(noUrlResult.origin).to.equal('bing');
            chai.expect(noUrlResult.query).to.equal('microsoft');
          });
          it('query:Mail, origin:yahoo', () => {
            const qHandler = new QueryHandler();
            const noUrlResult = qHandler.normalize('https://de.search.yahoo.com/search;_ylt=A9mSs3d_mx1ZNk4AygozCQx.;_ylc=X1MDMjExNDcxODAwMwRfcgMyBGZyA3lmcC10LTkxMQRncHJpZANaNUlQVXJpZ1JUaTBCWGZHYVJvbGpBBG5fcnNsdAMwBG5fc3VnZwM3BG9yaWdpbgNkZS5zZWFyY2gueWFob28uY29tBHBvcwMwBHBxc3RyAwRwcXN0cmwDBHFzdHJsAzcEcXVlcnkDTSU0MGFpbAR0X3N0bXADMTQ5NTExMjY2MQ--?p=Mail&fr2=sb-top-de.search&fr=yfp-t-911&fp=1', 'yahoo.de');
            chai.expect(noUrlResult.origin).to.equal('yahoo');
            chai.expect(noUrlResult.query).to.equal('mail');
          });
          it('query:Ma@il, origin:yahoo', () => {
            const qHandler = new QueryHandler();
            const noUrlResult = qHandler.normalize('https://de.search.yahoo.com/search;_ylt=A9mSs3d_mx1ZNk4AygozCQx.;_ylc=X1MDMjExNDcxODAwMwRfcgMyBGZyA3lmcC10LTkxMQRncHJpZANaNUlQVXJpZ1JUaTBCWGZHYVJvbGpBBG5fcnNsdAMwBG5fc3VnZwM3BG9yaWdpbgNkZS5zZWFyY2gueWFob28uY29tBHBvcwMwBHBxc3RyAwRwcXN0cmwDBHFzdHJsAzcEcXVlcnkDTSU0MGFpbAR0X3N0bXADMTQ5NTExMjY2MQ--?p=M%40ail&fr2=sb-top-de.search&fr=yfp-t-911&fp=1', 'yahoo.de');
            chai.expect(noUrlResult.origin).to.equal('yahoo');
            chai.expect(noUrlResult.query).to.equal('m@ail');
          });
        });

        context('Normalize test ', () => {
          it('query:fire, origin:amazon', () => {
            const qHandler = new QueryHandler();
            const UrlResult = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon.de');
            chai.expect(qHandler.queryPostings.fire).to.exist;
            chai.expect(UrlResult.query).to.equal('fire');
          });
        });

        context('Normalize test ', () => {
          it('tsToPosting test', () => {
            const qHandler = new QueryHandler();
            const UrlResult = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon.de');
            chai.expect(qHandler.tsToPostingMap).to.exist;
            chai.expect(qHandler.tsToPostingMap[Object.keys(qHandler.tsToPostingMap)[0]].full_query).to.equal('fire');
            chai.expect(qHandler.tsToPostingMap[Object.keys(qHandler.tsToPostingMap)[0]].origin).to.equal('amazon');
            chai.expect(qHandler.tsToPostingMap[Object.keys(qHandler.tsToPostingMap)[0]].tokens[0]).to.equal('fire');
            chai.expect(qHandler.tsToPostingMap[Object.keys(qHandler.tsToPostingMap)[0]].tokens[0]).to.not.equal('kindlefire');
            chai.expect(qHandler.tsToPostingMap[Object.keys(qHandler.tsToPostingMap)[0]].tokens[1]).to.not.exist;
          });
        });

        context('QueryMatch test', () => {
          it('match with empty filter', () => {
            const qHandler = new QueryHandler();
            // emulate several queries
            // one from google
            // one from amazon
            const amazonQuery = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon.de');
            const googleQuery = qHandler.normalize('https://www.google.de/?gws_rd=ssl#q=maps', 'google.de');

            // define symtethic tokenData and timeRange
            const tokenData = {
              contained: ['maps'],
              filtered: [],
            };
            const timeRange = 1000000;

            chai.expect(qHandler.matchTokens(tokenData, timeRange)).to.equal(true);
          });

          it('match with empty filter, negative time range', () => {
            const qHandler = new QueryHandler();
            // emulate several queries
            // one from google
            // one from amazon
            const amazonQuery = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon.de');
            const googleQuery = qHandler.normalize('https://www.google.de/?gws_rd=ssl#q=maps', 'google.de');

            // define symtethic tokenData and timeRange
            const tokenData = {
              contained: ['maps'],
              filtered: [],
            };
            const timeRange = -1000000;
            // since negative time range is ignored, a match must be detected
            chai.expect(qHandler.matchTokens(tokenData, timeRange)).to.equal(true);
          });


          it('insufficient match with long time range and no filter', () => {
            const qHandler = new QueryHandler();
            // emulate several queries
            // one from google
            // one from amazon
            const amazonQuery = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon.de');
            const googleQuery = qHandler.normalize('https://www.google.de/?gws_rd=ssl#q=maps', 'google.de');

            // define symtethic tokenData and timeRange
            const tokenData = {
              contained: ['maps', 'no_maps'],
              filtered: [],
            };
            const timeRange = 100000000;

            chai.expect(qHandler.matchTokens(tokenData, timeRange)).to.equal(false);
          });


          it('sufficient match with long time range and filter', () => {
            const qHandler = new QueryHandler();
            // emulate several queries
            // one from google
            // one from amazon
            const amazonQuery = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon.de');
            const googleQuery = qHandler.normalize('https://www.google.de/?gws_rd=ssl#q=maps', 'google.de');

            // define symtethic tokenData and timeRange
            const tokenData = {
              contained: ['maps', 'kindle'],
              filtered: ['filter'],
            };
            const timeRange = 100000000;

            chai.expect(qHandler.matchTokens(tokenData, timeRange)).to.equal(false);
          });

          it('wrong data', () => {
            const qHandler = new QueryHandler();
            // emulate several queries
            // one from google
            // one from amazon
            const amazonQuery = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire', 'amazon.de');
            const googleQuery = qHandler.normalize('https://www.google.de/?gws_rd=ssl#q=maps', 'google.de');

            // define symtethic tokenData and timeRange
            const tokenData = {
              broken_token: ['maps', 'kindle'],
              filtered: ['filter'],
            };
            const timeRange = 100000000;

            chai.expect(qHandler.matchTokens(tokenData, timeRange)).to.equal(false);
          });
        });

        context('Private: db test save', () => {
          it('query:fire_kindle, origin:amazon', () => {
            const db = {};
            const qHandler = new QueryHandler(db);
            const UrlResult = qHandler.normalize('https://www.amazon.de/s/ref=nb_sb_noss?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=fire_kindle', 'amazon.de');

            return qHandler._savePersistenceData().then((result) => {
              if (chai.expect(result)) {
                chai.expect(db['offers-queries'].posting_list[0].origin).to.equal('amazon');
                chai.expect(db['offers-queries'].posting_list[0].tokens[0]).to.equal('firekindle');
              }
            });
          });
        });

        context('Private: db test load', () => {
          it('query:fire, origin:amazon', () => {
            const db = {
              'offers-queries': {
                posting_list: [{
                  query: 'fire',
                  tokens: ['fire', 'firekindle'],
                  origin: 'amazon',
                  ts: 1111,
                }]
              }
            };
            const qHandler = new QueryHandler(db);
            return qHandler._loadPersistentData().then((result) => {
              if (chai.expect(result)) {
                // chai.expect(qHandler.queryPostings).to.equal('test');
                chai.expect(qHandler.tsToPostingMap['1111'].full_query).to.equal('fire');
                chai.expect(qHandler.tsToPostingMap['1111'].tokens[0]).to.equal('fire');
                chai.expect(qHandler.tsToPostingMap['1111'].tokens[1]).to.equal('firekindle');
                chai.expect(qHandler.tsToPostingMap['1111'].origin).to.equal('amazon');
              }
            });
          });
        });
      });
    });
  }
);
