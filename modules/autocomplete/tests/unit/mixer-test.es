const expect = chai.expect;

export default describeModule("autocomplete/mixer",
  function () {
    return {
      "autocomplete/url-complete": { default: {} },
      "core/utils": {
        default: {
          setTimeout,
          log: console.log.bind(console),
          encodeSources() { return []; },
          getDetailsFromUrl: function (url) { return { extra: "", path: "", host: "" }; },
          encodeResultType() { return ""; },
          isCompleteUrl() { return true; },
          generalizeUrl() { },
        },
      },
      "core/prefs": {
        default: {
          get() {},
          set() {}
        }
      },
      "core/platform": {
        isMobile: false,
      }
    }
  },
  function () {
    let mixer;
    beforeEach(function() {
      mixer = new (this.module().default)();
      // Disable cleaning of smartCLIQZ trigger URLs during testing
      mixer._cleanTriggerUrls = function() {};
    });

    describe('collectSublinks', function() {
      it('should find nothing', function() {
        var data = {
          dsf: 'Asfd',
          afds: {
            sdfa: {
              fds: 'fdsa',
            },
          },
        };
        var sublinks = mixer._collectSublinks(data);

        expect(sublinks).to.be.empty;
      });

      it('should find with key url', function() {
        var data = {
          dsf: 'Asfd',
          afds: {
            adfs: ['ff', 'ff'],
            sdfa: {
              url: 'http://www.test.com',
            },
          },
        };
        var sublinks = mixer._collectSublinks(data);

        expect(sublinks).to.contain('http://www.test.com');
      });

      it('should find with key href', function() {
        var data = {
          dsf: 'Asfd',
          afds: {
            adfs: ['ff', 'ff'],
            sdfa: {
              href: 'http://www.test.com',
            },
          },
        };
        var sublinks = mixer._collectSublinks(data);

        expect(sublinks).to.contain('http://www.test.com');
      });

      it('should find three', function() {
        var data = {
          dsf: 'Asfd',
          url: 'http://bbb.com',
          afds: {
            adfs: ['ff', 'ff'],
            sdfa: [
              {
                href: 'http://www.test.com',
              },
              {
                href: 'http://aaa.com',
              },
            ],
          },
        };
        var sublinks = mixer._collectSublinks(data);

        expect(sublinks).to.contain('http://www.test.com');
        expect(sublinks).to.contain('http://aaa.com');
        expect(sublinks).to.contain('http://bbb.com');
      });

    });

    describe('getDuplicates', function() {
      var results, cliqz;
      beforeEach(function() {
        results = [
          {
            style: 'favicon',
            val: 'https://www.facebook.com/',
            comment: 'Facebook',
            label: 'https://www.facebook.com/',
            query: 'f',
            data: {
              kind: ['H'],
              debug: '(history generic)!',
              description: 'Facebook is a social utility.',
            },
          },
          {
            style: 'favicon',
            val: 'http://www.fasd-hh.rosenke.de/',
            comment: 'FASD-Hamburg - Startseite',
            label: 'http://www.fasd-hh.rosenke.de/',
            query: 'f',
            data: {
              kind: ['H'],
              debug: '(history generic)!',
              description: 'FASD-Hamburg',
            },
          },
        ];

        cliqz = [
          {
            style: 'cliqz-results sources-m',
            val: 'https://mail.facebook.com/',
            comment: 'Facebook',
            label: 'https://mail.facebook.com/',
            query: 'bm f undefined',
            data: {
              description: 'Facebook ist ein soziales.',
              title: 'Facebook',
              kind: ['m|{"i":0}'],
            },
          },
          {
            style: 'cliqz-results sources-m',
            val: 'https://fxyz.com/',
            comment: 'FXYZ',
            label: 'https://fxyz.com/',
            query: 'bm f undefined',
            data: {
              description: 'FXYZ is cool',
              title: 'FXYZ',
              kind: ['m|{"i":1}'],
            },
          },
        ];
      });

      it('should find no duplicates', function() {
        var duplicates = mixer._getDuplicates(results, cliqz);
        expect(duplicates).to.be.empty;
      });

      it('should find one duplicate - main link', function() {
        cliqz[0].label = cliqz[0].val = results[0].label;
        var duplicates = mixer._getDuplicates(results, cliqz);
        expect(duplicates).to.have.length(1);
        expect(duplicates[0]).to.be.deep.equal(cliqz[0]);
      });

      it('should find one duplicate - sub link', function() {
        results[0].style = 'cliqz-pattern';
        results[0].data.urls = [{href: 'https://mail.facebook.com/'}];
        var duplicates = mixer._getDuplicates(results, cliqz);
        expect(duplicates).to.have.length(1);
        expect(duplicates[0]).to.be.deep.equal(cliqz[0]);
      });

      it('should find one duplicate - main link different country', function() {
        cliqz[0].label = cliqz[0].val = 'https://de-de.facebook.com/';
        var duplicates = mixer._getDuplicates(results, cliqz);
        expect(duplicates).to.have.length(1);
        expect(duplicates[0]).to.be.deep.equal(cliqz[0]);
      });
    });

    describe('deduplicateResults', function() {
      var results, cliqz;
      beforeEach(function() {
        results = [
          {
            style: 'favicon',
            val: 'https://www.facebook.com/',
            comment: 'Facebook',
            label: 'https://www.facebook.com/',
            query: 'f',
            data: {
              kind: ['H'],
              debug: '(history generic)!',
              description: 'Facebook is a social utility.',
            },
          },
          {
            style: 'favicon',
            val: 'http://www.fasd-hh.rosenke.de/',
            comment: 'FASD-Hamburg - Startseite',
            label: 'http://www.fasd-hh.rosenke.de/',
            query: 'f',
            data: {
              kind: ['H'],
              debug: '(history generic)!',
              description: 'FASD-Hamburg',
            },
          },
        ];

        cliqz = [
          {
            style: 'cliqz-results sources-m',
            val: 'https://mail.facebook.com/',
            comment: 'Facebook',
            label: 'https://mail.facebook.com/',
            query: 'bm f undefined',
            data: {
              description: 'Facebook ist ein soziales.',
              title: 'Facebook',
              kind: ['m|{"i":0}'],
            },
          },
          {
            style: 'cliqz-results sources-m',
            val: 'https://fxyz.com/',
            comment: 'FXYZ',
            label: 'https://fxyz.com/',
            query: 'bm f undefined',
            data: {
              description: 'FXYZ is cool',
              title: 'FXYZ',
              kind: ['m|{"i":1}'],
            },
          },
        ];
      });

      it('should leave both lists alone', function() {
        var r = mixer._deduplicateResults(results, cliqz);

        expect(r.first).to.have.length(2);
        expect(r.second).to.have.length(2);
      });

      it('should remove facebook from cliqz', function() {
        cliqz[0].label = cliqz[0].val = results[0].label;

        var r = mixer._deduplicateResults(results, cliqz);

        expect(r.first).to.have.length(2);
        expect(r.second).to.have.length(1);

        // Check kinds are combined properly
        expect(r.first[0].data.kind).to.contain(cliqz[0].data.kind[0]);
      });

      it('should remove facebook from cliqz because of matching sublink', function() {
        results[0].style = 'cliqz-pattern';
        results[0].data.urls = [{href: 'https://mail.facebook.com/'}];

        var r = mixer._deduplicateResults(results, cliqz);

        expect(r.first).to.have.length(2);
        expect(r.second).to.have.length(1);
      });

      it('should remove facebook from cliqz because only different by country', function() {
        cliqz[0].label = cliqz[0].val = 'https://de-de.facebook.com/';

        var r = mixer._deduplicateResults(results, cliqz);

        expect(r.first).to.have.length(2);
        expect(r.second).to.have.length(1);

        // Check kinds are combined properly
        expect(r.first[0].data.kind).to.contain(cliqz[0].data.kind[0]);
      });
    });

    describe('filterConflictingEZ', function() {

      var firstResult, ezs;

      beforeEach(function() {
        firstResult = {
          style: 'cliqz-pattern',
          val: 'https://cliqz.com/',
          comment: 'Cliqz',
          label: 'https://cliqz.com/',
          query: 'cliqz.c',
          data: {
            cluster: true,
            urls: [],
          },
        };

        ezs = [
        {
          style: 'cliqz-extra',
          val: 'https://cliqz.com/',
          comment: 'Cliqz',
          label: 'https://cliqz.com/',
          query: 'cliqz.c',
          data: {
              friendly_url: 'cliqz.com',
              template: 'Cliqz',
              trigger_urls: ['cliqz.com'],
              ts: 1447772162,
              kind: ['X|{"id":"-7290289273393613729","trigger_method":"rh_query"}'],
              subType: {
                class: "CliqzEZ",
                id: "2700150093133398460",
                name: "Cliqz 1",
              },
            },
        },
      ];
      });

      it('should not conflict if history matches', function() {
        var finalExtra = mixer._filterConflictingEZ(ezs, firstResult);
        expect(finalExtra).to.deep.equal(ezs);
      });

      it('should not conflict if no bet', function() {
        firstResult.val = 'http://facebook.com';
        firstResult.data.cluster = false;
        var finalExtra = mixer._filterConflictingEZ(ezs, firstResult);
        expect(finalExtra).to.deep.equal(ezs);
      });

      it('should conflict if history bet does not match', function() {
        firstResult.val = 'http://facebook.com';
        var finalExtra = mixer._filterConflictingEZ(ezs, firstResult);
        expect(finalExtra).to.have.length(0);
      });

      // Will the autocomplete change if we use this EZ?
      it('should conflict if autocomplete does not match', function() {
        firstResult.val = 'http://facebook.com';
        firstResult.cluster = false;
        firstResult.autocompleted = true;
        var finalExtra = mixer._filterConflictingEZ(ezs, firstResult);
        expect(finalExtra).to.have.length(0);
      });

    });
  }
);
