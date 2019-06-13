import {
  queryHTML,
  testServer,
  waitFor,
} from '../../../tests/core/integration/helpers';
import basicTest from '../../../tests/dropdown-tests/integration/shared/basic';
import { getTab } from '../../../platform/tabs';
import { isWebExtension } from '../../../core/platform';

function runCodeAt(tabId, code) {
  return new Promise((resolve) => {
    chrome.tabs.executeScript(tabId, { code }, ([response]) => resolve(response));
  });
}

const testPageUrl = testServer.getBaseUrl('testpage');
const waitForTestPage = async tabId => getTab(tabId);
const injectTestUtils = async () => {};
const checkIframeExists = async tab => runCodeAt(tab.id, `(() => {
  const overlay = document.querySelector('html > span:last-of-type');
  if (!overlay || !overlay.shadowRoot) {
    return false;
  }
  return overlay.shadowRoot.querySelector('#cliqz-dropdown') !== null;
})()`);

const testHelpersExistFunc = async (tab) => {
  await waitFor(async () => {
    const testHelpersExist = await runCodeAt(tab.id, `
      window.CLIQZ && window.CLIQZ && !!window.CLIQZ.tests;
    `);
    return testHelpersExist;
  });
};

const triggerIframeCreation = async (tab) => {
  await testHelpersExistFunc(tab);
  return runCodeAt(tab.id, 'window.CLIQZ.tests.overlay.toggle(); window.CLIQZ.tests.overlay.close();');
};

const getIframeStyle = async () => {
  const style = await queryHTML(testPageUrl, '#cliqz-dropdown', 'style', {
    shadowRootSelector: 'html > span:last-of-type',
    attributeType: 'attribute',
  });
  return style[0];
};

const getUIStyle = async tab => runCodeAt(tab.id, `(() => {
  const overlay = document.querySelector('html > span:last-of-type');
  if (!overlay || !overlay.shadowRoot) {
    return false;
  }
  return !overlay.shadowRoot.querySelector('.ui').classList.contains('hidden');
})()`);

const fillIn = async ({ view: tab, query }) => {
  await testHelpersExistFunc(tab);
  await new Promise(resolve => chrome.tabs
    .executeScript(tab.id, { code: 'window.CLIQZ.tests.overlay.toggle();' }, resolve));

  await waitFor(async () => getUIStyle(tab));

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
        checkIframeExists,
        fillIn,
        getIframeStyle,
        injectTestUtils,
        testPageUrl,
        triggerIframeCreation,
        waitForTestPage,
      });
    });
  });
}
