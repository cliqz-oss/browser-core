import {
  app,
  blurUrlBar,
  expect,
  fillIn,
  mockPref,
  mockSearch,
  press,
  testServer,
  wait,
  waitFor,
  waitForPopup,
  withHistory,
} from './helpers';
import inject from '../../../core/kord/inject';

async function getSearchParams(query, { resultsNumber = 1, blur = true } = {}) {
  if (blur) {
    await blurUrlBar();
  }

  await mockSearch({ results: [{ url: 'https://test.com' }] });
  withHistory([]);
  fillIn(query);
  await waitForPopup(resultsNumber);
  const hits = await testServer.getLastHits();
  const parameters = hits.get('/api/v2/results').query;
  return parameters;
}

export default function () {
  context('parameters test', function () {
    const query = 't';
    let hits;
    let parameters;
    let restorePref;
    let restoreContextSearchPref;

    beforeEach(async function () {
      restoreContextSearchPref = await mockPref('modules.context-search.enabled', false);
    });

    afterEach(function () {
      restoreContextSearchPref();
      parameters = '';
    });

    context('query', function () {
      beforeEach(async function () {
        parameters = await getSearchParams(query);
      });

      it(`query ${query} received by server`, function () {
        expect(parameters.q).to.equal(query);
      });
    });

    context('session', function () {
      let session;

      beforeEach(async function () {
        parameters = await getSearchParams(query);
        session = parameters.s;
      });

      it('session with length > 10 received by server', async function () {
        expect(session.length).to.be.above(10);
      });

      context('type new query', function () {
        beforeEach(async function () {
          const newQuery = 'new query';
          parameters = await getSearchParams(
            newQuery,
            { blur: false }
          );
        });

        it('session remains the same', function () {
          expect(parameters.s).to.equal(session);
        });
      });

      context('blur urlbar and type new query', function () {
        beforeEach(async function () {
          const newQuery = 'new query';
          parameters = await getSearchParams(newQuery);
        });

        it('session changes', function () {
          expect(parameters.s).to.not.equal(session);
        });
      });
    });

    context('_sessionSeq and _queryCount', function () {
      beforeEach(async function () {
        parameters = await getSearchParams('t');
      });

      it('parameters n=0, qc=0 received by server', async function () {
        expect(parameters.n).to.equal('0');
        expect(parameters.qc).to.equal('0');
      });

      context('on typing second symbol', function () {
        beforeEach(async function () {
          await mockSearch({ results: [{ url: 'https://test.com' }] });
          withHistory([]);

          // need to wait 500 ms, because qc increases if there is more than 500 ms
          // between the typing of symbols
          await wait(500);
          press({ key: 'a', code: 'KeyA' });
          await waitForPopup(1);
          await waitFor(async () => {
            hits = await testServer.getLastHits();
            parameters = hits.get('/api/v2/results').query;
            return parameters.q === `${query}a`;
          });
        });

        it('n=1, qc=0', function () {
          expect(parameters.n).to.equal('1');
          expect(parameters.qc).to.equal('0');
        });

        context('on typing third symbol', function () {
          beforeEach(async function () {
            await mockSearch({ results: [{ url: 'https://test.com' }] });
            withHistory([]);

            // need to wait 500 ms, because qc increases if there is more than 500 ms
            // between the typing of symbols
            await wait(500);

            press({ key: 'a', code: 'KeyA' });
            await waitForPopup(1);
            await waitFor(async () => {
              hits = await testServer.getLastHits();
              parameters = hits.get('/api/v2/results').query;
              return parameters.q === `${query}aa`;
            });
          });

          it('n=2, qc=1', function () {
            expect(parameters.n).to.equal('2');
            expect(parameters.qc).to.equal('1');
          });
        });
      });
    });

    context('resultOrder', function () {
      beforeEach(async function () {
        parameters = await getSearchParams(query);
      });

      it('o="[]" received by server', function () {
        expect(parameters.o).to.equal('[]');
      });
    });

    context('language', function () {
      beforeEach(async function () {
        restorePref = await mockPref('extensions.cliqz-lang.data', '{"de":[-20,-213,-128,-164,-242,86,104,213,242,-6,-180,-36,197,32,-96,-216,-7,160,-90,-65,194,254,239,18,-229,170,-133,63,-251,127,-63,-102,78,-112,-210,199,61,209,-148],"en":[98,-111,-167,-56,246,137,-172,227,-176,-42,-180,194,223,-2,-92,157,89,234,-95,135,125,213,6,-179,-203,-58,184,-10,-208,-7,130,-138,-88,-187,-246,-91,66,195,83,-148,1,101,-77,-151,-102,110,14,-185,128,70,-216,-236,39,18,146,108,-242,-31,165,206,-139,-202,-222,-251,203,-63,-50,226,-248,-219,105,-254,10,180,63,13,210,238,93,-87,199,-164,30,235,-241,-192,44,64,127,-26,-23,-142,-97,-156,252,61,91,-255],"ru":[-56,24,-79,157,-62,7,-210,15,-207,147,108,44,227,145,152,162,-104,140,153,205,-85,73,42,-214,176,-202],"fr":[-73,-111,199],"el":[-28],"sv":[0]}');

        // need to restart core-cliqz to call CliqzLanguage.init()
        await app.disableModule('core-cliqz');
        await app.enableModule('core-cliqz');

        parameters = await getSearchParams(query);
      });

      afterEach(function () {
        restorePref();
      });

      it('top 2 languages received by server', async function () {
        expect(parameters.lang).to.equal('en,de');
      });
    });

    xcontext('locale', function () {
      ['de', 'en-US', 'fr', 'ru-RU'].forEach(function (locale) {
        context(`set to "${locale}"`, function () {
          beforeEach(async function () {
            restorePref = await mockPref('locale', locale, 'general.useragent.');
            parameters = await getSearchParams(query);
          });

          afterEach(function () {
            restorePref();
          });

          it(`locale ${locale} received by server`, function () {
            expect(parameters.locale).to.equal(locale);
          });
        });
      });
    });

    context('platform', function () {
      beforeEach(async function () {
        parameters = await getSearchParams(query);
      });

      it('correct platform received by server', function () {
        expect(parameters.platform).to.equal('0');
      });
    });

    context('country', function () {
      ['de', 'fr', 'us', 'es', 'it', 'gb', 'at'].forEach(function (country) {
        context(`set to "${country}"`, function () {
          beforeEach(async function () {
            restorePref = await mockPref('backend_country', country);
            parameters = await getSearchParams(query);
          });

          afterEach(function () {
            restorePref();
          });

          it(`country "${country}" received by server`, function () {
            expect(parameters.country).to.equal(country);
          });
        });
      });
    });

    context('adult', function () {
      const data = {
        conservative: 3,
        moderate: 0,
        liberal: 1
      };

      Object.keys(data).forEach(function (adultPref) {
        context(`set to "${adultPref}"`, function () {
          beforeEach(async function () {
            restorePref = await mockPref('adultContentFilter', adultPref);
            parameters = await getSearchParams(query);
          });

          afterEach(function () {
            restorePref();
          });

          it('correct adult settings received by server', function () {
            expect(parameters.adult).to.equal(data[adultPref].toString());
          });
        });
      });
    });

    context('location', function () {
      context('set to "yes"', function () {
        beforeEach(async function () {
          restorePref = await mockPref('share_location', 'yes');
          inject.service('geolocation', ['setGeolocation']).setGeolocation({
            latitude: 1.234,
            longitude: 5.678,
          });
          parameters = await getSearchParams(query);
        });

        afterEach(async function () {
          restorePref();
          await inject.service('geolocation', ['updateGeoLocation']).updateGeoLocation();
        });

        it('location setting "yes" received by server', function () {
          expect(parameters.loc_pref).to.equal('yes');
        });

        it('lat and lng received by server', function () {
          expect(parameters.loc).to.equal('1.234,5.678,U');
        });
      });

      ['no', 'ask'].forEach(function (locationPref) {
        context(`set to "${locationPref}"`, function () {
          beforeEach(async function () {
            restorePref = await mockPref('share_location', locationPref);
            parameters = await getSearchParams(query);
          });

          afterEach(function () {
            restorePref();
          });

          it(`location settings "${locationPref}" received by server`, function () {
            expect(parameters.loc_pref).to.equal(locationPref);
            expect(parameters.loc).to.be.undefined;
          });
        });
      });
    });

    context('count', function () {
      [
        { 'modules.context-search.enabled': true, countExpected: '10' },
        { 'modules.context-search.enabled': false, countExpected: '5' },
      ].forEach((preferences) => {
        context(`modules.context-search.enabled: ${preferences['modules.context-search.enabled']}`,
          function () {
            beforeEach(async function () {
              restorePref = await mockPref('modules.context-search.enabled', preferences['modules.context-search.enabled']);
              parameters = await getSearchParams(query);
            });

            afterEach(function () {
              restorePref();
            });

            it(`parameter "count=${preferences.countExpected}" received by server`, function () {
              expect(parameters.count).to.equal(preferences.countExpected);
            });
          });
      });
    });

    context('suggestions', function () {
      [
        { suggestionsEnabled: true, suggestionChoice: 0, suggestionsExpected: '1' },
        { suggestionsEnabled: false, suggestionChoice: 0, suggestionsExpected: '0' },
        { suggestionsEnabled: true, suggestionChoice: 1, suggestionsExpected: '1' },
        { suggestionsEnabled: false, suggestionChoice: 1, suggestionsExpected: '1' },
      ].forEach((preferences) => {
        context(`suggestionsEnabled: ${preferences.suggestionsEnabled}, suggestionChoice: ${preferences.suggestionChoice}`,
          function () {
            let restorePref1;
            let restorePref2;
            beforeEach(async function () {
              restorePref1 = await mockPref('suggestionsEnabled', preferences.suggestionsEnabled);
              restorePref2 = await mockPref('suggestionChoice', preferences.suggestionChoice);
              parameters = await getSearchParams(query);
            });

            afterEach(function () {
              restorePref1();
              restorePref2();
            });

            it(`parameter "suggest=${preferences.suggestionsExpected}" received by server`, function () {
              expect(parameters.suggest).to.equal(preferences.suggestionsExpected);
            });
          });
      });
    });

    context('jsonpCallback', function () {
      beforeEach(async function () {
        parameters = await getSearchParams(query);
      });

      it('is not received by server', function () {
        expect(parameters.callback).to.be.undefined;
      });
    });
  });
}
