/* global chai, describeModule */
const DIALS_PREF = 'extensions.cliqzLocal.freshtab.speedDials';
const mockTopUrls = [
  {
    url: 'http://facebook.com',
  },
  {
    url: 'http://youtube.com',
  },
  {
    url: 'http://cliqz.com/',
  },
];
const dialFacebook1 = { url: 'http://facebook.com', title: 'Facebook' };
const dialFacebook2 = { url: 'https://facebook.com', title: 'Facebook' };
const dialYoutube = { url: 'https://youtube.com', title: 'Youtube' };
const dialBadURL = { url: 'bad URL is bad', title: 'Facebook' };
const dialCliqz = { url: 'https://cliqz.com', title: 'Cliqz' };
const dialCliqzSearch = { url: 'http://cliqz.com?search=some query', title: 'Cliqz search' };
const dialCliqzSearchEncoded = { url: 'http://cliqz.com?search=some%20query', title: 'Cliqz search' };

export default describeModule('freshtab/speed-dials',
  function () {
    return {
      'platform/kv-store': {},
      'platform/lib/zlib': {},
      'platform/gzip': {},
      'platform/fetch': {
        AbortController: {},
      },
      'platform/globals': {
        chrome: {},
      },
      'core/services/logos': {
        default: {
          getLogoDetails() {
            return {};
          }
        }
      },
      'core/prefs': {
        default: {
          __prefs: {},
          __reset(init) { this.__prefs = init || {}; },
          get(key, def, prefix = '') {
            return this.__prefs[prefix + key] || def;
          },
          set(key, value) {
            this.__prefs[key] = value;
          },
          has(key) { return key in this.__prefs; },
          getObject(key, def, prefix = '') {
            try {
              return JSON.parse(this.__prefs[prefix + key]);
            } catch (e) {
              return def || {};
            }
          },
          setObject(key, value, prefix = '') {
            this.__prefs[prefix + key] = JSON.stringify(value);
          },
        }
      },
      'platform/freshtab/history': {
        default: { getTopUrls({ exclude }) {
          const e = new Set(exclude);
          return mockTopUrls.filter(({ url }) => !e.has(url));
        } }
      },
    };
  },
  function () {
    let SpeedDials;

    beforeEach(function () {
      SpeedDials = this.module().default;
      this.deps('core/prefs').default.__reset();
    });

    describe('SpeedDials', function () {
      describe('#get', function () {
        it('should return "most visited" and "custom" speed dials', async function () {
          const mockCustom = [
            { url: 'https://bild.de/' },
            { url: 'https://www.spiegel.com/' },
          ];
          this.deps('core/prefs').default.setObject(DIALS_PREF, { custom: mockCustom });
          const { custom, history } = await SpeedDials.get();

          mockCustom.forEach(({ url }, i) => {
            chai.expect(custom[i].url).equal(url);
          });
          mockTopUrls.forEach(({ url }, i) => {
            chai.expect(history[i].url).equal(url);
          });
        });

        it('should not include "most visited" which already present in "custom" section', async function () {
          const mockCustom = [
            { url: 'https://facebook.com' },
          ];
          this.deps('core/prefs').default.setObject(DIALS_PREF, { custom: mockCustom });
          const { history } = await SpeedDials.get();

          chai.expect(history.length).equal(2);
          chai.expect(history[0].url).equal(mockTopUrls[1].url);
        });

        it('should not include "most visited" hidden by user', async function () {
          this.deps('core/prefs').default.setObject('extensions.cliqzLocal.freshtab.speedDials', {
            hidden: ['http://facebook.com/', 'https://youtube.com'],
            history: {
              171601621: { hidden: true }
            }
          });
          const { history } = await SpeedDials.get();
          chai.expect(history.length).equal(0);
        });

        it('should return correct "custom" speed dials with encoded URLs', async function () {
          const mockCustom = [
            { url: 'https%3A%2F%2Fbild.de%2F' },
            { url: 'https%3A%2F%2Fwww.spiegel.com%2F' },
          ];
          const decodedMockedURLs = ['https://bild.de/', 'https://www.spiegel.com/'];
          this.deps('core/prefs').default.setObject(DIALS_PREF, { custom: mockCustom });
          const { custom } = await SpeedDials.get();

          decodedMockedURLs.forEach((url, i) => {
            chai.expect(custom[i].url).equal(url);
          });
        });
      });

      describe('#addCustom', function () {
        it('should adds a new custom speed dial', async function () {
          SpeedDials.addCustom(dialFacebook1);
          const { custom } = await SpeedDials.get();
          const dial = custom[0];

          chai.expect(SpeedDials.hasCustom).equal(true);
          chai.expect(dial.custom).equal(true);
          chai.expect(dial.url).equal(dialFacebook1.url);
          chai.expect(dial.displayTitle).equal(dialFacebook1.title);
        });

        it('should insert a newly added dial at given index', async function () {
          SpeedDials.addCustom(dialFacebook1);
          SpeedDials.addCustom(dialCliqz, 0);
          const { custom } = await SpeedDials.get();
          const firstDial = custom[0];

          chai.expect(custom.length).equal(2);
          chai.expect(firstDial.url).equal(dialCliqz.url);
          chai.expect(firstDial.displayTitle).equal(dialCliqz.title);
        });

        describe('should not add a dial with existing URL and return a "duplicate" instead', function () {
          it('(normal URLs)', async function () {
            SpeedDials.addCustom(dialFacebook1);
            const result = SpeedDials.addCustom(dialFacebook2);
            const { custom } = await SpeedDials.get();

            chai.expect(custom.length).equal(1);
            chai.expect(result.error).equal(true);
            chai.expect(result.reason).equal('duplicate');
          });

          it('(encoded URLs #1)', async function () {
            SpeedDials.addCustom(dialCliqzSearch);
            const result = SpeedDials.addCustom(dialCliqzSearchEncoded);
            const { custom } = await SpeedDials.get();

            chai.expect(custom.length).equal(1);
            chai.expect(result.error).equal(true);
            chai.expect(result.reason).equal('duplicate');
          });

          it('(encoded URLs #2)', async function () {
            SpeedDials.addCustom(dialCliqzSearchEncoded);
            const result = SpeedDials.addCustom(dialCliqzSearch);
            const { custom } = await SpeedDials.get();

            chai.expect(custom.length).equal(1);
            chai.expect(result.error).equal(true);
            chai.expect(result.reason).equal('duplicate');
          });
        });

        it('should not add a dial with bad URL and return an "invalid" error instead', async function () {
          const result = SpeedDials.addCustom(dialBadURL);
          const { custom } = await SpeedDials.get();

          chai.expect(custom.length).equal(0);
          chai.expect(result.error).equal(true);
          chai.expect(result.reason).equal('invalid');
        });
      });

      describe('#editCustom', function () {
        it('should change an existing custom speed dial', async function () {
          SpeedDials.addCustom(dialFacebook1);
          SpeedDials.editCustom(dialFacebook1.url, dialCliqz);
          const { custom } = await SpeedDials.get();
          const dial = custom[0];

          chai.expect(dial.custom).equal(true);
          chai.expect(dial.url).equal(dialCliqz.url);
          chai.expect(dial.displayTitle).equal(dialCliqz.title);
        });

        it('edited dial should stay at the same position', async function () {
          SpeedDials.addCustom(dialFacebook1);
          SpeedDials.addCustom(dialYoutube);
          SpeedDials.editCustom(dialYoutube.url, dialCliqz);
          const { custom } = await SpeedDials.get();
          const dial = custom[1];

          chai.expect(dial.url).equal(dialCliqz.url);
          chai.expect(dial.displayTitle).equal(dialCliqz.title);
        });

        it('should not change a dial when new URL is invalid and return an "invalid" error', async function () {
          SpeedDials.addCustom(dialFacebook1);
          const result = SpeedDials.editCustom(dialFacebook1.url, dialBadURL);
          const { custom } = await SpeedDials.get();
          const dial = custom[0];

          chai.expect(dial.url).equal(dialFacebook1.url);
          chai.expect(dial.displayTitle).equal(dialFacebook1.title);
          chai.expect(result.error).equal(true);
          chai.expect(result.reason).equal('invalid');
        });

        it('should correctly edit "custom" speed dials with encoded URL', async function () {
          const mockCustom = [
            { url: 'http%3A%2F%2Fcliqz.com%3Fsearch%3Dsome%20query' },
          ];
          const url = 'http://cliqz.com?search=some%20query';
          const newURL = 'http://example.com';
          this.deps('core/prefs').default.setObject(DIALS_PREF, { custom: mockCustom });
          const result = SpeedDials.editCustom(url, { url: newURL });
          chai.expect(result.url).equal(newURL);

          const { custom } = await SpeedDials.get();
          chai.expect(custom[0].url).equal(newURL);
        });
      });

      describe('#remove', function () {
        const urlToRemove = 'https://facebook.com/';

        it('should remove a previously added custom speed dial', async function () {
          SpeedDials.addCustom({ url: urlToRemove });
          SpeedDials.remove({ custom: true, url: urlToRemove });
          const { custom } = await SpeedDials.get();
          chai.expect(custom.length).equal(0);
        });

        it('should mark as hidden removed "most visited" dial', function () {
          SpeedDials.remove({ custom: false, url: urlToRemove });
          const { hidden } = this.deps('core/prefs').default.getObject(DIALS_PREF);

          chai.expect(hidden.length).equal(1);
          chai.expect(SpeedDials.hasHidden).equal(true);
          chai.expect(hidden).to.deep.equal([urlToRemove]);
        });
      });

      describe('#restore', function () {
        it('should remove a given URL from hidden', function () {
          this.deps('core/prefs').default.setObject(DIALS_PREF, {
            hidden: ['http://cliqz.com', 'https://cliqz.com', 'https://cliqz.com/', 'https://youtube.com'],
            history: {
              171601621: { hidden: true }
            }
          });
          SpeedDials.restore('http://cliqz.com/');
          const { hidden, history } = this.deps('core/prefs').default.getObject(DIALS_PREF);
          chai.expect(hidden.length).equal(1);
          chai.expect(Object.keys(history).length).equal(0);
        });
      });

      describe('#restoreAll', function () {
        it('should remove a given URL from hidden', function () {
          this.deps('core/prefs').default.setObject(DIALS_PREF, {
            hidden: ['http://cliqz.com', 'https://youtube.com'],
            history: {
              171601621: { hidden: true }
            }
          });
          SpeedDials.restoreAll();
          const { hidden, history } = this.deps('core/prefs').default.getObject(DIALS_PREF);
          chai.expect(hidden.length).equal(0);
          chai.expect(Object.keys(history).length).equal(0);
        });
      });
    });
  });
