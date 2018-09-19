import {
  app,
  expect,
  getElements,
  getLocalisedString,
  newTab,
  queryHTML,
  waitFor,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

const fishyUrl = 'http://testantiphishing.clyqz.com/ping';
const warningUrl = 'chrome://cliqz/content/anti-phishing/phishing-warning.html?u=';
const encodedFullUrl = warningUrl + encodeURIComponent(fishyUrl);

export default function () {
  describe('Anti-phishing', function () {
    context('when turned on', function () {
      before(async function () {
        await newTab(fishyUrl, { focus: true });
      });

      describe('renders the warning page', function () {
        const mainWarningSelector = '.cqz-anti-phishing-warning';
        let $mainElement;

        before(async function () {
          await waitForElement({
            url: encodedFullUrl,
            selector: mainWarningSelector,
          });

          $mainElement = await getElements({
            elementSelector: mainWarningSelector,
            parentElementSelector: 'body',
            url: encodedFullUrl,
          });
          expect($mainElement).to.have.length(1);
        });

        it('with red background', async function () {
          waitFor(() => expect(win.getComputedStyle($mainElement[0]).backgroundColor)
            .to.equal('rgb(233, 42, 41)'));
        });

        it('with a warning image', function () {
          const $warningImage = $mainElement[0].querySelector('.cqz-title img');

          expect($warningImage).to.exist;
          expect($warningImage.src).to.exist;
          expect($warningImage.src).to.contain('white-warning');
        });

        it('with a header', function () {
          const $header = $mainElement[0].querySelector('.cqz-title .cliqz-locale');

          expect($header).to.exist;
          expect($header).to.have.text(getLocalisedString('anti_phishing_txt0'));
        });

        it('with a full warning message', function () {
          const $message = $mainElement[0].querySelector('.cqz-info');

          expect($message).to.exist;
          expect($message).to.contain.text(getLocalisedString('anti_phishing_txt1'));
          expect($message).to.contain.text(fishyUrl);
          expect($message).to.contain.text(getLocalisedString('anti_phishing_txt2'));
        });

        it('with a "Learn more" link', function () {
          const $learnMore = $mainElement[0].querySelector('#learn-more');

          expect($learnMore).to.exist;
          expect($learnMore.href).to.exist;
          expect($learnMore).to.contain.text(getLocalisedString('anti_phishing_txt3'));
          expect($learnMore.href).to.equal('https://cliqz.com/whycliqz/anti-phishing');
        });

        it('with a "Go to a safe website" button', function () {
          const $safeWebsiteBtn = $mainElement[0].querySelector('.cqz-button-save-out');

          expect($safeWebsiteBtn).to.exist;
          expect($safeWebsiteBtn).to.contain.text(getLocalisedString('anti_phishing_txt4'));
        });

        it('with a "Report this page as safe" button', function () {
          const $reportBtn = $mainElement[0].querySelector('#report-safe');

          expect($reportBtn).to.exist;
          expect($reportBtn).to.contain.text(getLocalisedString('anti_phishing_txt5'));
        });

        it('with a "Proceed despite risks" button', function () {
          const $proceedBtn = $mainElement[0].querySelector('#proceed');

          expect($proceedBtn).to.exist;
          expect($proceedBtn).to.contain.text(getLocalisedString('anti_phishing_txt6'));
        });
      });
    });

    context('when turned off', function () {
      before(async function () {
        app.modules['anti-phishing'].background.unload();
        await newTab(fishyUrl, { focus: true });
        await waitForElement({
          url: fishyUrl,
          selector: 'body',
        });
      });

      after(async function () {
        app.modules['anti-phishing'].background.init();
      });

      it('renders the target page', async function () {
        const fishyPageContent = await queryHTML(fishyUrl, 'body', 'textContent');

        expect(fishyPageContent).to.have.length(1);
        expect(fishyPageContent[0]).to.equal('PONG');
      });
    });
  });
}
