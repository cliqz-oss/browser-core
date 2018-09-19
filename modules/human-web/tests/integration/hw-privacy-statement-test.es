import prefs from '../../../core/prefs';
import { isWebExtension } from '../../../core/platform';
import {
  app,
  click,
  closeTab,
  expect,
  getLocalisedString,
  newTab,
  queryHTML,
  waitFor,
} from '../../../tests/core/integration/helpers';

export default function () {
  if (isWebExtension) {
    return;
  }

  const privacyStatementUrl = 'resource://cliqz/human-web/humanweb.html';
  const privacyCheckboxSelector = '#enableHumanWeb';

  describe('HumanWeb privacy statement page', function () {
    let hwTabId;
    let privacyPageContent;
    let privacyCheckboxState;

    beforeEach(async function () {
      await app.modules['human-web'].isReady();
    });

    afterEach(function () {
      prefs.set('humanWebOptOut', false);
      waitFor(() => !prefs.get('humanWebOptOut'));
    });

    describe('renders', function () {
      beforeEach(async function () {
        hwTabId = await newTab(privacyStatementUrl);
        await waitFor(async () => {
          const $pageHeaders = await queryHTML(privacyStatementUrl, 'h1[key="humanWeb1"]', 'innerText');
          return (($pageHeaders.length !== 0) && ($pageHeaders[0] !== ''));
        });
      });

      afterEach(function () {
        closeTab(hwTabId);
      });

      it('with correct text', async function () {
        privacyPageContent = await queryHTML(privacyStatementUrl, '#container', 'innerHTML');

        expect(privacyPageContent).to.have.length(1);
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb1'));
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb2'));
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb3'));
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb4'));
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb5'));
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb6'));
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb7'));
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb8'));
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb9'));
        expect(privacyPageContent[0]).to.contain(getLocalisedString('humanWeb10'));
      });

      it('with "humanWebOptOut" pref set to false and ticked checkbox as default', async function () {
        expect(prefs.get('humanWebOptOut')).to.be.false;

        privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
        expect(privacyCheckboxState).to.have.length(1);
        expect(privacyCheckboxState[0]).to.be.true;
      });
    });

    [true, false].forEach((prefState) => {
      context(`when "humanWebOptOut" pref is set to ${prefState}`, function () {
        beforeEach(async function () {
          prefs.set('humanWebOptOut', prefState);
          waitFor(() => prefs.get('humanWebOptOut'));

          hwTabId = await newTab(privacyStatementUrl);
          await waitFor(async () => {
            const $pageHeaders = await queryHTML(privacyStatementUrl, 'h1[key="humanWeb1"]', 'innerText');
            return (($pageHeaders.length !== 0) && ($pageHeaders[0] !== ''));
          });
        });

        afterEach(function () {
          closeTab(hwTabId);
        });

        it(`renders with consent checkbox ${prefState ? '' : 'not'} checked`, async function () {
          privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
          expect(privacyCheckboxState).to.have.length(1);

          waitFor(() => expect(privacyCheckboxState[0]).to.equal(!prefState));
        });
      });
    });

    context('clicking on the consent checkbox', function () {
      beforeEach(async function () {
        hwTabId = await newTab(privacyStatementUrl);

        await waitFor(async () => {
          privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
          return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === true));
        });
      });

      afterEach(function () {
        closeTab(hwTabId);
      });

      context('once', function () {
        beforeEach(async function () {
          await click(privacyStatementUrl, 'input#enableHumanWeb');
          await waitFor(async () => {
            privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
            return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === false));
          });
        });

        it('flips "humanWebOptOut" pref to true', function () {
          expect(prefs.get('humanWebOptOut')).to.equal(true);
        });
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

        it('flips "humanWebOptOut" pref to false', function () {
          expect(prefs.get('humanWebOptOut')).to.equal(false);
        });
      });
    });
  });
}
