import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  getLocalisedString,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsDialNumber';

export default function () {
  context('for dial number result', function () {
    const dialNumberAreaSelector = '.dialing-code';
    const dialIconSelector = '.dial-phone-icon';
    const dialCodeSelector = '.dial-code';
    const countryFlagSelector = '.country-flag';
    const countryNameSelector = '.dial-country-name';
    const labelSelector = '.dial-code-label';

    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('germany dialing code');
      await waitForPopup(1);
    });

    after(function () {
      win.preventRestarts = false;
    });

    describe('renders dial number result', function () {
      it('successfully', async function () {
        const $dialNumberArea = await $cliqzResults.querySelector(dialNumberAreaSelector);
        expect($dialNumberArea).to.exist;
      });

      it('with existing icon', async function () {
        const $dialIcon = await $cliqzResults.querySelector(dialIconSelector);
        expect($dialIcon).to.exist;
      });

      it('with correct dial number', async function () {
        const $dialCode = await $cliqzResults.querySelectorAll(dialCodeSelector);

        expect($dialCode).to.exist;
        expect($dialCode)
          .to.have.text(`+${results[0].snippet.extra.dialing_prefix}`);
      });

      it('with correct country flag', async function () {
        const $countryFlag = await $cliqzResults.querySelector(countryFlagSelector);

        expect($countryFlag).to.exist;
        expect($countryFlag.src).to.equal(results[0].snippet.extra.flag_uri);
      });

      it('with correct country name', async function () {
        const $countryName = await $cliqzResults.querySelector(countryNameSelector);

        expect($countryName).to.exist;
        expect($countryName)
          .to.have.text(results[0].snippet.extra.country_name);
      });

      it('with correct dialing code label', async function () {
        const $label = await $cliqzResults.querySelector(labelSelector);
        expect($label).to.exist;
        expect($label).to.have.text(
          `${getLocalisedString('dialing_code_label')} 00${results[0].snippet.extra.dialing_prefix}`
        );
      });
    });
  });
}
