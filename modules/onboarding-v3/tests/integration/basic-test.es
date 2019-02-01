import {
  click,
  getResourceUrl,
  newTab,
  waitForElement,
  waitForPageLoad,
} from '../../../tests/core/integration/helpers';

const onboardingUrl = getResourceUrl('onboarding-v3/index.html');

export default function () {
  xdescribe('onboarding-v3', function () {
    beforeEach(async function () {
      await newTab(onboardingUrl, { focus: true });
      await waitForElement({
        url: onboardingUrl,
        selector: '#cqb-start-btn',
      });
    });

    context('on start button click', function () {
      it('opens new tab page', async function () {
        const isPageLoaded = waitForPageLoad(onboardingUrl);
        await click(onboardingUrl, '#cqb-start-btn');
        await isPageLoaded;
      });
    });
  });
}
