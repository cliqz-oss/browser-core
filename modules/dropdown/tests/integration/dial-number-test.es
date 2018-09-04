import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  getLocalisedString,
  mockSearch,
  testsEnabled,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsDialNumber';

export default function () {
  if (!testsEnabled()) { return; }

  context('for dial number result', function () {
    const dialNumberAreaSelector = '.dialing-code';
    const dialIconSelector = '.dial-phone-icon';
    const dialCodeSelector = '.dial-code';
    const countryFlagSelector = '.country-flag';
    const countryNameSelector = '.dial-country-name';
    const labelSelector = '.dial-code-label';

    before(async function () {
      win.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('germany dialing code');
      await waitForPopup(2);
    });

    after(function () {
      win.preventRestarts = false;
    });

    describe('renders dial number result', function () {
      it('successfully', function () {
        const $dialNumberArea = $cliqzResults.querySelector(dialNumberAreaSelector);
        expect($dialNumberArea).to.exist;
      });

      it('with existing icon', function () {
        const $dialIcon = $cliqzResults.querySelector(dialIconSelector);
        expect($dialIcon).to.exist;
      });

      it('with correct dial number', function () {
        const $dialCode = $cliqzResults.querySelectorAll(dialCodeSelector);

        expect($dialCode).to.exist;
        expect($dialCode)
          .to.have.text(`+${results[0].snippet.extra.dialing_prefix}`);
      });

      it('with correct country flag', function () {
        const $countryFlag = $cliqzResults.querySelector(countryFlagSelector);

        expect($countryFlag).to.exist;
        expect($countryFlag.src).to.equal(results[0].snippet.extra.flag_uri);
      });

      it('with correct country name', function () {
        const $countryName = $cliqzResults.querySelector(countryNameSelector);

        expect($countryName).to.exist;
        expect($countryName)
          .to.have.text(results[0].snippet.extra.country_name);
      });

      it('with correct dialing code label', function () {
        const $label = $cliqzResults.querySelector(labelSelector);
        expect($label).to.exist;
        expect($label).to.have.text(
          `${getLocalisedString('dialing_code_label')} 00${results[0].snippet.extra.dialing_prefix}`
        );
      });
    });
  });
}
