import {
  queryHTML,
  testServer,
  sleep,
} from '../../../tests/core/test-helpers';
import basicTest from '../../../tests/dropdown-tests/integration/shared/basic';
import { getTab } from '../../../platform/tabs';
import { isWebExtension } from '../../../core/platform';

const testPageUrl = testServer.getBaseUrl('testpage');
const waitForTestPage = async tabId => getTab(tabId);
const injectTestUtils = async () => {};
const getIframeStyle = async () => {
  const style = await queryHTML(testPageUrl, '#cliqz-dropdown', 'style', {
    shadowRootSelector: '.cliqz-search',
    attributeType: 'attribute',
  });
  return style[0];
};
const fillIn = async ({ view: tab, query }) => {
  chrome.tabs.executeScript(tab.id, {
    code: 'window.CLIQZ.tests.overlay.toggle();',
  });

  // TODO: should go away after exectureScript will be wrapped by async helper
  await sleep(50);

  chrome.tabs.executeScript(tab.id, {
    code: `window.CLIQZ.tests.overlay.fillIn("${query}");`,
  });
};

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('overlay search frame', function () {
    context('on any website', function () {
      beforeEach(async function () {
        await testServer.registerPathHandler('/testpage', { result: '<html><body><p>Hello world</p></body></html>' });
      });

      basicTest({
        waitForTestPage,
        injectTestUtils,
        getIframeStyle,
        fillIn,
        testPageUrl,
      });
    });
  });
}
