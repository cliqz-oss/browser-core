import {
  getResourceUrl,
  prefs,
  waitFor,
} from '../../../tests/core/integration/helpers';
import config from '../../../freshtab/config';
import { isWebExtension } from '../../../core/platform';
import basicTest from '../../../tests/dropdown-tests/integration/shared/basic';

const freshtabUrl = getResourceUrl('freshtab/home.html');

const checkIframeExists = async (view) => {
  const iframe = view.document.querySelector('#cliqz-dropdown');
  return !!(iframe && iframe.src);
};
const triggerIframeCreation = async (view) => {
  await waitFor(() => view.document.querySelector('input'));
  const input = view.document.querySelector('input');
  input.dispatchEvent(new Event('focus'));
};
const getIframeStyle = async (view) => {
  const iframe = view.document.querySelector('#cliqz-dropdown');

  if (!iframe) {
    throw new Error('could not find dropdown iframe');
  }

  return iframe.getAttribute('style');
};

const fillIn = async ({
  query,
  view,
  testUtils,
}) => {
  await waitFor(() => view.document.querySelector('input'));
  const input = view.document.querySelector('input');
  input.dispatchEvent(new Event('focus'));
  await waitFor(() => checkIframeExists(view));
  input.value = query;
  testUtils.Simulate.keyDown(input, {});
  testUtils.Simulate.input(input);
};

const waitForFreshtab = tabId => waitFor(() => chrome.extension.getViews({ tabId })[0]);

const injectTestUtils = (view) => {
  let resolver;
  let rejecter;
  const testUtilsPromise = new Promise((res, rej) => {
    resolver = res;
    rejecter = rej;
  });
  const testUtils = view.document.createElement('script');
  const inject = () => {
    view.document.head.appendChild(testUtils);

    testUtils.onload = () => {
      resolver(view.ReactTestUtils);
    };

    testUtils.onerror = () => {
      rejecter('test utils could not load');
    };

    testUtils.src = chrome.extension.getURL('modules/vendor/react-dom-test-utils.js');
  };

  if (view.document.readyState === 'complete' || view.document.readyState === 'interactive') {
    inject();
  } else {
    view.addEventListener('DOMContentLoaded', inject);
  }

  return testUtilsPromise;
};

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('freshtab search frame', function () {
    before(function () {
      prefs.set(config.constants.PREF_SEARCH_MODE, 'search');
    });

    basicTest({
      waitForTestPage: waitForFreshtab,
      injectTestUtils,
      getIframeStyle,
      checkIframeExists,
      triggerIframeCreation,
      fillIn,
      testPageUrl: freshtabUrl,
    });
  });
}
