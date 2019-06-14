/* global chai, describeModule */

const tldts = require('tldts');
const punycode = require('punycode');
const moment = require('moment');

export default describeModule('freshtab/background',
  function () {
    return {
      'platform/lib/moment': {
        default: moment,
      },
      'core/services/telemetry': {
        default: {
          push: () => {},
        },
      },
      'core/http': {
        default: {
        },
      },
      'core/console': {
        isLoggingEnabled: () => false,
        default: {
          log() {},
        },
      },
      'core/events': {
        default: {
          sub() {},
          un_sub() {}
        },
      },
      'freshtab/main': {
        default: {
          startup() {},
          shutdown() {},
          rollback() {},
        }
      },
      'freshtab/news': {
        default: { unload() {} },
      },
      'freshtab/wallpapers': {
        default: { getWallpapers() { } }
      },
      'platform/freshtab/history': {
        default: { getTopUrls() { } }
      },
      'platform/freshtab/browser-import-dialog': {
        default: { openImportDialog() { } }
      },
      'platform/ext-messaging': {
        default: { sendMessage() {} }
      },
      'core/search-engines': {
        isSearchServiceReady() { return Promise.resolve(); },
        getSearchEngines: '[dynamic]'
      },
      'core/services/logos': {
        default: {
          getLogoDetails() { return ''; },
        },
      },
      'core/url': {
        getDetailsFromUrl() { return {}; },
        tryEncodeURIComponent: '[dynamic]',
        tryDecodeURIComponent: '[dynamic]',
        stripTrailingSlash: '[dynamic]',
        equals() { return true; },
      },
      'core/onboarding': {

      },
      'freshtab/adult-domain': {
        default: function (...args) { this.prototype.constructor.apply(this, args); }
      },
      'core/base/background': {
        default: b => b
      },
      'core/browser': {
        forEachWindow: function () {}
      },
      'core/platform': {
        isCliqzBrowser: true,
        isDesktopBrowser: true,
        getResourceUrl: function () {}
      },
      'core/prefs': {
        default: {
          get(pref, def) { return def; },
          set() {},
          has() {},
          getObject() { return {}; },
          setObject() {},
        }
      },
      'core/i18n': {
        getLanguageFromLocale: function () {}
      },
      'platform/history-service': {
        default: {
          onVisitRemoved: {
            addListener() {},
            removeListener() {}
          },
        }
      },
      'core/history-manager': {
        HistoryManager: {
          removeFromHistory() {},
          removeFromBookmarks() {},
        }
      },
      'platform/lib/tldts': tldts,
      'platform/lib/punycode': {
        default: punycode,
      },
    };
  },
  function () {
    let subject;

    beforeEach(function () {
      subject = this.module().default;
      this.deps('freshtab/adult-domain').default.prototype = function () {};
      this.deps('freshtab/adult-domain').default.prototype.isAdult = function () {
        return false;
      };
      subject.init({});
    });

    describe('#unload', function () {
      it('calls unload on News', function (done) {
        const News = this.deps('freshtab/news').default;
        News.unload = function () { done(); };
        this.module().default.unload();
      });

      context('quick unload', function () {
        it('calls shutdown on FreshTab', function (done) {
          const FreshTab = this.deps('freshtab/main').default;
          FreshTab.shutdown = function () { done(); };
          this.module().default.unload({ quick: true });
        });
      });

      context('non quick unload', function () {
        it('calls rollback on FreshTab', function (done) {
          const FreshTab = this.deps('freshtab/main').default;
          FreshTab.rollback = function () { done(); };
          this.module().default.unload({ quick: false });
        });
      });
    });

    context('events', function () {
      describe('geolocation:wake-notification', function () {
        it('fetches news', function (done) {
          subject.actions.getNews = () => Promise.resolve().then(() => done());
          subject.events[
            'geolocation:wake-notification'
          ] = subject.events['geolocation:wake-notification'].bind(subject);

          subject.events['geolocation:wake-notification']();
        });

        it('having news calls action refreshFrontend', function (done) {
          // const subject = this.module().default;

          subject.actions.getNews = () => Promise.resolve();
          subject.actions.refreshFrontend = () => done();

          subject.events[
            'geolocation:wake-notification'
          ] = subject.events['geolocation:wake-notification'].bind(subject);

          subject.events['geolocation:wake-notification']();
        });
      });
    });

    describe('actions', function () {
      let prefs;

      beforeEach(function () {
        prefs = {};

        this.deps('core/url').tryDecodeURIComponent = function (s) {
          try {
            return decodeURIComponent(s);
          } catch (e) {
            return s;
          }
        };

        this.deps('core/prefs').default.get = function (key, def, prefix = '') {
          return prefs[prefix + key] || def;
        };

        this.deps('core/prefs').default.getObject = function (key, def, prefix = '') {
          return prefs[prefix + key] || def || {};
        };

        this.deps('core/prefs').default.has = function (key) { return key in prefs; };

        this.deps('core/prefs').default.set = function (key, value) {
          prefs[key] = value;
        };

        this.deps('core/prefs').default.setObject = function (key, value, prefix = '') {
          prefs[prefix + key] = value;
        };

        this.deps('core/search-engines').getSearchEngines = () =>
          ([
            {
              name: 'Google',
              alias: '#go',
              default: true,
              icon: 'data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=',
              base_url: 'https://www.google.com/search?q=&ie=utf-8&oe=utf-8&client=firefox-b',
              urlDetails: {},
            }
          ]);

        this.deps('core/url').stripTrailingSlash = function (url) { return url; };
      });

      describe('#getSpeedDials', function () {
        let historyResults;

        beforeEach(function () {
          const History = this.deps('platform/freshtab/history').default;
          historyResults = [
            { url: 'http://cliqz.com/', title: 'Cliqz', total_count: 32341, custom: false },
            { url: 'https://github.com', title: 'Github navigation extension', total_count: 2548, custom: false },
            { url: 'http://www.spiegel.com/', title: 'Spiegel Nachrichten', total_count: 1626, custom: false }
          ];
          History.getTopUrls = function () {
            return Promise.resolve(historyResults);
          };

          // bind action to module
          this.module().default.actions.getSpeedDials = this.module().default.actions.getSpeedDials
            .bind(this.module().default);
        });

        it('display history tiles', function () {
          return this.module().default.actions.getSpeedDials().then((result) => {
            chai.expect(result.history.length).to.equal(historyResults.length);
            historyResults.forEach((history, i) => {
              chai.expect(result.history[i]).to.have.property('title').that.equal(history.url);
              chai.expect(result.history[i]).to.have.property('url').that.equal(history.url);
              chai.expect(result.history[i]).to.have.property('displayTitle').that.equal(history.title);
              chai.expect(result.history[i]).to.have.property('custom').that.equal(false);
              chai.expect(result.history[i]).to.have.property('logo').that.equal('');
            });
          });
        });

        it('display manually added custom tiles', function () {
          this.deps('core/prefs').default.set('extensions.cliqzLocal.freshtab.speedDials', JSON.stringify({
            custom: [
              { url: 'https://yahoo.com/', title: 'yahoo', custom: true },
              { url: 'https://www.gmail.com/', title: 'gmail', custom: true }
            ]
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            const customTiles = result.custom.filter(tile => tile.custom);
            chai.expect(customTiles.length).to.equal(2);
          });
        });


        it('do NOT display manually deleted history tiles', function () {
          this.deps('core/prefs').default.set('extensions.cliqzLocal.freshtab.speedDials', JSON.stringify({
            history: {
              171601621: { hidden: true }
            },
            custom: [
              { url: 'https://www.spiegel.com/' }
            ]
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            chai.expect(result.custom.length).to.equal(1);
            chai.expect(result.history.length).to.equal(2);
          });
        });

        it('do NOT display history tiles in 1st row when manually added to 2nd row', function () {
          this.deps('core/prefs').default.set('extensions.cliqzLocal.freshtab.speedDials', JSON.stringify({
            custom: [
              { url: 'https://www.yahoo.com/' },
              { url: 'http://cliqz.com/' }
            ]
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            chai.expect(result.custom.length).to.equal(2);
            chai.expect(result.history.length).to.equal(2);
          });
        });
      });

      describe('#addSpeedDial', function () {
        beforeEach(function () {
          // bind action to module
          this.module().default.actions.addSpeedDial = this.module().default.actions.addSpeedDial
            .bind(this.module().default);

          this.module().default.actions.getSpeedDials = function () {
            return Promise.resolve({ history: [], custom: [] });
          };

          this.module().default.actions.getVisibleDials = function () {
            return Promise.resolve([]);
          };

          this.deps('core/url').stripTrailingSlash = url => url;
          this.deps('core/url').tryEncodeURIComponent = url => url;
        });

        context('with no other custom speed dials', function () {
          it('adds new custom speed dial', function () {
            const url = 'http://cliqz.com';
            const title = 'cliqz';

            return this.module().default.actions.addSpeedDial({ url, title }).then(
              (newSpeedDial) => {
                const speedDials = prefs['extensions.cliqzLocal.freshtab.speedDials'];

                chai.expect(speedDials.custom).to.deep.equal([
                  {
                    url: url,
                    title: title
                  }
                ]);
                chai.expect(newSpeedDial).to.have.property('title').that.equal(url);
                chai.expect(newSpeedDial).to.have.property('url').that.equal(url);
                chai.expect(newSpeedDial).to.have.property('displayTitle').that.equal(title);
                chai.expect(newSpeedDial).to.have.property('custom').that.equal(true);
                chai.expect(newSpeedDial).to.have.property('logo').that.equal('');
              }
            );
          });
        });

        context('speed dials already present', function () {
          it('do NOT add duplicate urls (after sanitization)', function () {
            this.deps('core/url').stripTrailingSlash = function () { return 'always_the_same'; };

            const url = 'https://www.cliqz.com/';
            const title = 'cliqz';

            this.module().default.actions.getSpeedDials = function () {
              return Promise.resolve({
                history: [],
                custom: [
                  {
                    url: 'https://www.cliqz.com',
                    title: 'cliqz'
                  }
                ]
              });
            };

            this.module().default.actions.getVisibleDials = function () {
              return Promise.resolve([
                {
                  url: 'https://www.cliqz.com',
                  title: 'cliqz'
                }
              ]);
            };

            return this.module().default.actions.addSpeedDial({ url, title }).then((result) => {
              chai.expect(result).to.deep.equal({ error: true, reason: 'duplicate' });
            });
          });
        });

        context('speed dial url is invalid', function () {
          it('should not add local pages (file:/// or about:)', function () {
            const url = 'about:config';
            const title = 'invalidUrl';

            return this.module().default.actions.addSpeedDial({ url, title }).then((result) => {
              chai.expect(result).to.deep.equal({ error: true, reason: 'invalid' });
            });
          });
        });
      });

      describe('#removeSpeedDial', function () {
        beforeEach(function () {
          // bind action to module
          this.module().default.actions
            .removeSpeedDial = this.module().default.actions
              .removeSpeedDial.bind(this.module().default);
        });

        context('NO previous deleted tiles', function () {
          it('remove history speed dial', function () {
            const speedDial = {
              url: 'http://cliqz.com/',
              custom: false
            };
            this.module().default.actions.removeSpeedDial(speedDial);
            const speedDials = JSON.parse(this.deps('core/prefs').default.get('extensions.cliqzLocal.freshtab.speedDials'));
            chai.expect(speedDials).to.deep.equal({
              history:
                {
                  171601621: { hidden: true }
                }
            });
          });
        });

        context('custom speed dials already present', function () {
          it('remove custom speed dial', function () {
            this.deps('core/prefs').default.set('extensions.cliqzLocal.freshtab.speedDials', JSON.stringify({
              custom: [
                { url: 'http://cliqz.com/' },
                { url: 'https://www.spiegel.com/' }
              ]
            }));

            const speedDial = {
              url: 'http://cliqz.com/',
              custom: true
            };
            this.module().default.actions.removeSpeedDial(speedDial);
            const speedDials = JSON.parse(this.deps('core/prefs').default.get('extensions.cliqzLocal.freshtab.speedDials'));
            chai.expect(speedDials).to.deep.equal({
              custom: [
                { url: 'https://www.spiegel.com/' }
              ]
            });
          });
        });
      });
    });
  });
