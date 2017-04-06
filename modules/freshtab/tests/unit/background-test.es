export default describeModule("freshtab/background",
  function () {
    return {
      "core/events": {
        default: {
          sub() {},
          un_sub() {}
        },
      },
      "freshtab/main": {
        default: {
          startup() {},
          shutdown() { }
        }
      },
      "freshtab/news": {
        default: { unload() {}, },
      },
      "freshtab/history": {
        default: { getTopUrls(limit) { } }
      },
      "core/utils": { default: {} },
      "freshtab/speed-dial": {
        default: function () { this.prototype.constructor.apply(this, arguments) }
      },
      "core/onboarding": {

      },
      "freshtab/adult-domain": {
        default: function () { this.prototype.constructor.apply(this, arguments) }
      },
      "core/base/background": {
        default: b => b
      },
      "core/browser": {
        forEachWindow: function () {}
      }
    }
  },
  function () {
    let subject;

    beforeEach(function () {
      subject = this.module().default;
      this.deps("freshtab/adult-domain").default.prototype = function() {}
      this.deps("freshtab/adult-domain").default.prototype.isAdult = function() {
        return false
      }
      subject.init({});
    });

    describe("#unload", function () {
      it("calls unload on News", function (done) {
        const News = this.deps("freshtab/news").default;
        News.unload = function () { done(); };
        this.module().default.unload();
      });

      it("calls shutdown on FreshTab", function (done) {
        const FreshTab = this.deps("freshtab/main").default;
        FreshTab.shutdown = function () { done(); };
        this.module().default.unload();
      });
    });

    context('events', function () {

      describe("geolocation:wake-notification", function() {

        it("fetches news", function (done) {
          subject.actions.getNews = () => Promise.resolve().then(() => done());
          subject.events['geolocation:wake-notification'] =
            subject.events['geolocation:wake-notification'].bind(subject);

          subject.events['geolocation:wake-notification']();
        })

        it("having news calls action refreshFrontend", function(done){
          const subject = this.module().default;

          subject.actions.getNews = () => Promise.resolve();
          subject.actions.refreshFrontend = () => done();

          subject.events['geolocation:wake-notification'] =
            subject.events['geolocation:wake-notification'].bind(subject);

          subject.events['geolocation:wake-notification']();
        });

      });

    });

    describe("actions", function () {
      let prefs;

      beforeEach(function() {
        prefs = {};

        this.deps("core/utils").default.tryDecodeURIComponent = function(s) {
          try {
            return decodeURIComponent(s);
          } catch(e) {
            return s;
          }
        }

        this.deps("core/utils").default.getPref = function(key, def) {
          return prefs[key] || def;
        }

        this.deps("core/utils").default.hasPref = function(key) { return key in prefs; }

        this.deps("core/utils").default.setPref = function(key, value) {
          prefs[key] = value;
        }

        this.deps("core/utils").default.log = function() {};

        this.deps("core/utils").default.getDetailsFromUrl = function() { return {}; }

        this.deps("core/utils").default.getLogoDetails = function() { return ''; }

        this.deps('freshtab/speed-dial').default.prototype = function (url, custom) {
          this.title = url;
          this.url = url;
          this.displayTitle = url;
          this.custom = custom;
          this.logo = '';
        }

        this.deps("core/utils").default.hash = function(url) {
          if(url === 'http://cliqz.com/') {
            return '171601621';
          } else {
            return Math.floor(Math.random(0,1) *10000)
          }
        }

        this.deps("core/utils").default.stripTrailingSlash = function(url) { return url; }
      });

      describe("#getSpeedDials", function() {

        let history_results;

        beforeEach(function() {
          const History = this.deps("freshtab/history").default;
          history_results = [
              {"url":"http://cliqz.com/","title":"Cliqz","total_count":32341},
              {"url":"https://github.com","title":"Github navigation extension","total_count":2548},
              {"url":"http://www.spiegel.com/","title":"Spiegel Nachrichten","total_count":1626}
          ];
          History.getTopUrls = function(limit) {
            return Promise.resolve(history_results);
          }

          //bind action to module
          this.module().default.actions.getSpeedDials = this.module().default.actions.getSpeedDials
            .bind(this.module().default);
        })

        it('display history tiles', function() {

          return this.module().default.actions.getSpeedDials().then((result) => {
            chai.expect(result.history.length).to.equal(history_results.length);
            history_results.forEach((history, i) => {
              chai.expect(result.history[i]).to.have.property('title').that.equal(history.url)
              chai.expect(result.history[i]).to.have.property('url').that.equal(history.url)
              chai.expect(result.history[i]).to.have.property('displayTitle').that.equal(history.url)
              chai.expect(result.history[i]).to.have.property('custom').that.equal(false)
              chai.expect(result.history[i]).to.have.property('logo').that.equal('')
            });

          });
        });

        it('display manually added custom tiles', function() {
          this.deps("core/utils").default.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
            "custom": [
              { url: "https://yahoo.com/" },
              { url: "https://www.gmail.com/" }
            ]
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            var customTiles = result.custom.filter((tile) => tile.custom);
            chai.expect(customTiles.length).to.equal(2);
          });
        });


        it('do NOT display manually deleted history tiles', function() {
          this.deps("core/utils").default.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
            "history": {
              "171601621": { "hidden": true }
            },
            "custom": [
              {"url": "https://www.spiegel.com/"}
            ]
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            chai.expect(result.custom.length).to.equal(1);
            chai.expect(result.history.length).to.equal(2);
          });
        });

        it('do NOT display history tiles in 1st row when manually added to 2nd row', function() {

          this.deps("core/utils").default.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
            "custom": [
              {"url": "https://www.yahoo.com/"},
              {"url": "http://cliqz.com/"}
            ]
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            chai.expect(result.custom.length).to.equal(2);
            chai.expect(result.history.length).to.equal(2);
          });
        });
      });

      describe("#addSpeedDial", function () {

        beforeEach(function () {
          // bind action to module
          this.module().default.actions.addSpeedDial = this.module().default.actions.addSpeedDial
            .bind(this.module().default);

          this.module().default.actions.getSpeedDials = function () {
            return Promise.resolve({ speedDials: [] });
          };

          this.module().default.actions.getVisibleDials = function(historyLimit) {
            return Promise.resolve([]);
          }

          this.deps("core/utils").default.stripTrailingSlash = url => url;
          this.deps("core/utils").default.tryEncodeURIComponent = url => url;

        });

        context("with no other custom speed dials", function () {
          it("adds new custom speed dial", function () {

            const url = "http://cliqz.com";

            return this.module().default.actions.addSpeedDial(url).then((newSpeedDial) => {
              //throw new Error(JSON.stringify(newSpeedDial))
              const speedDials = JSON.parse(this.deps("core/utils").default.getPref("extensions.cliqzLocal.freshtab.speedDials"));

              chai.expect(speedDials.custom).to.deep.equal([
                { "url": url }
              ]);
              chai.expect(newSpeedDial).to.have.property('title').that.equal(url)
              chai.expect(newSpeedDial).to.have.property('url').that.equal(url);
              chai.expect(newSpeedDial).to.have.property('displayTitle').that.equal(url)
              chai.expect(newSpeedDial).to.have.property('custom').that.equal(true)
              chai.expect(newSpeedDial).to.have.property('logo').that.equal("")

            });
          });
        });

        context("speed dials already present", function () {

          it("do NOT add duplicate urls (after sanitization)", function() {
            this.deps("core/utils").default.stripTrailingSlash = function(url) { return 'always_the_same'; }

            const url = "https://www.cliqz.com/";

            this.module().default.actions.getSpeedDials = function () {
              return Promise.resolve({
                speedDials: [
                  { url: 'https://www.cliqz.com' }
                ]
              });
            };

            this.module().default.actions.getVisibleDials = function(historyLimit) {
              return Promise.resolve([
                { url: 'https://www.cliqz.com' }
              ]);
            }

            return this.module().default.actions.addSpeedDial(url).then((result) => {
              chai.expect(result).to.deep.equal({ error: true, reason: 'duplicate'});
            });
          });

        });
      });

      describe("#removeSpeedDial", function() {

        beforeEach(function() {
          // bind action to module
          this.module().default.actions.removeSpeedDial = this.module().default.actions.removeSpeedDial
            .bind(this.module().default);
        });

        context("NO previous deleted tiles", function() {
          it("remove history speed dial", function() {
            //this.deps("core/utils").default.setPref("extensions.cliqzLocal.freshtab.speedDials", ''));

            const speedDial = {
              "url": "http://cliqz.com/",
              "custom": false
            }
            this.module().default.actions.removeSpeedDial(speedDial);
            let speedDials = JSON.parse(this.deps("core/utils").default.getPref("extensions.cliqzLocal.freshtab.speedDials"));
            chai.expect(speedDials).to.deep.equal({
              "history":
                {
                  "171601621": { "hidden": true}
                }
              });
          });
        });

        context("custom speed dials already present", function() {

          it("remove custom speed dial", function() {
            this.deps("core/utils").default.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
              "custom": [
                { "url": "http://cliqz.com/" },
                { "url": "https://www.spiegel.com/" }
              ]
            }));

            const speedDial = {
              "url": "http://cliqz.com/",
              "custom": true
            }
            this.module().default.actions.removeSpeedDial(speedDial);
            let speedDials = JSON.parse(this.deps("core/utils").default.getPref("extensions.cliqzLocal.freshtab.speedDials"));
            chai.expect(speedDials).to.deep.equal({
              "custom": [
                { "url": "https://www.spiegel.com/" }
              ]});
          });
        });
      });
    });
  }
);
