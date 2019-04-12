import {
  app,
  click,
  expect,
  getLocalisedString,
  getResourceUrl,
  newTab,
  prefs,
  queryHTML,
  waitFor,
  waitForPrefChange,
} from '../../../tests/core/integration/helpers';

export default function () {
  const privacyStatementUrl = getResourceUrl('human-web/humanweb.html');
  const privacyCheckboxSelector = '#enableHumanWeb';

  describe('HumanWeb privacy statement page', function () {
    let privacyPageContent;
    let privacyCheckboxState;

    beforeEach(async function () {
      await app.modules['human-web'].isReady();
    });

    describe('renders', function () {
      beforeEach(async function () {
        await newTab(privacyStatementUrl);
        await waitFor(async () => {
          const $pageHeaders = await queryHTML(privacyStatementUrl, 'h1[key="hw_page_header"]', 'innerText');
          return (($pageHeaders.length !== 0) && ($pageHeaders[0] !== ''));
        });
      });

      it('with correct text', async function () {
        privacyPageContent = await queryHTML(privacyStatementUrl, '#container', 'innerHTML');

        expect(privacyPageContent).to.have.length(1);
        for (let index = 1; index < 11; index += 1) {
          expect(privacyPageContent[0]).to.contain(getLocalisedString(`humanWeb${index}`));
        }
      });

      it('with "humanWebOptOut" pref set to false and ticked checkbox as default', async function () {
        expect(Boolean(prefs.get('humanWebOptOut'), false)).to.be.false;
        await waitFor(async () => {
          privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
          expect(privacyCheckboxState).to.have.length(1);
          return expect(privacyCheckboxState[0]).to.be.true;
        });
      });
    });

    [true, false].forEach((prefState) => {
      context(`when "humanWebOptOut" pref is set to ${prefState}`, function () {
        beforeEach(async function () {
          // waitForPrefChange will not resolve if we change pref
          // to the default one
          if (prefs.get('humanWebOptOut') !== prefState) {
            const prefChanged = waitForPrefChange('humanWebOptOut');
            prefs.set('humanWebOptOut', prefState);
            await prefChanged;
          }

          await newTab(privacyStatementUrl);
          await waitFor(async () => {
            const $pageHeaders = await queryHTML(privacyStatementUrl, 'h1[key="hw_page_header"]', 'innerText');
            return (($pageHeaders.length !== 0) && ($pageHeaders[0] !== ''));
          });
        });

        afterEach(async function () {
          if (prefs.get('humanWebOptOut') !== prefState) {
            const prefChanged = waitForPrefChange('humanWebOptOut');
            prefs.set('humanWebOptOut', !prefState);
            await prefChanged;
          }
        });

        it(`renders with consent checkbox ${prefState ? '' : 'not'} checked`, async function () {
          await waitFor(async () => {
            privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
            return ((privacyCheckboxState.length === 1) && (privacyCheckboxState[0] !== undefined));
          });

          await waitFor(() => expect(privacyCheckboxState[0]).to.equal(!prefState));
        });
      });
    });

    context('clicking on the consent checkbox', function () {
      beforeEach(async function () {
        await newTab(privacyStatementUrl);

        await waitFor(async () => {
          privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
          return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === true));
        });
      });

      context('once', function () {
        beforeEach(async function () {
          await click(privacyStatementUrl, 'input#enableHumanWeb');
          await waitFor(async () => {
            privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
            return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === false));
          });
        });

        afterEach(async function () {
          const prefChanged = waitForPrefChange('humanWebOptOut');
          prefs.set('humanWebOptOut', false);
          await prefChanged;
        });

        it('flips "humanWebOptOut" pref to true', () => waitFor(
          () => expect(prefs.get('humanWebOptOut')).to.equal(true),
          2000,
        ));
      });

      context('twice', function () {
        beforeEach(async function () {
          await click(privacyStatementUrl, 'input#enableHumanWeb');
          await waitFor(async () => {
            privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
            return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === false));
          });

          await click(privacyStatementUrl, 'input#enableHumanWeb');
          await waitFor(async () => {
            privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
            return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === true));
          });
        });

        it('flips "humanWebOptOut" pref to false', () => waitFor(
          () => expect(prefs.get('humanWebOptOut')).to.equal(false),
          2000,
        ));
      });
    });
  });
}
