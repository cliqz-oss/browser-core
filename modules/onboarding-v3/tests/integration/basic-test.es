import {
  click,
  getResourceUrl,
  newTab,
  waitForElement,
  waitForPageLoad,
} from '../../../tests/core/integration/helpers';
import config from '../../../core/config';

const onboardingUrl = config.settings.ONBOARDING_URL;
const freshtabUrl = getResourceUrl('freshtab/home.html');

export default function () {
  describe('onboarding-v3', function () {
    beforeEach(async function () {
      await newTab(onboardingUrl, { focus: true });
      await waitForElement({
        url: onboardingUrl,
        selector: '#cqb-start-btn',
      });
    });

    context('on start button click', function () {
      it('opens new tab page', async function () {
        const isPageLoaded = waitForPageLoad(freshtabUrl);
        await click(onboardingUrl, '#cqb-start-btn');
        await isPageLoaded;
      });
    });
  });
}
