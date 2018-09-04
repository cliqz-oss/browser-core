import {
  newTab,
  waitForAsync,
  expect,
} from '../../../../tests/core/test-helpers';
import {
  mockSearch,
  withHistory,
} from '../../../../tests/core/integration/search-helpers';

export default function ({
  waitForTestPage,
  injectTestUtils,
  getIframeStyle,
  fillIn,
  testPageUrl,
}) {
  let tabId;
  let view;
  let testUtils;

  beforeEach(async function () {
    tabId = await newTab(testPageUrl);
    view = await waitForTestPage(tabId);
    testUtils = await injectTestUtils(view);
  });

  it('renders 0 height iframe for results', async function () {
    await waitForAsync(async () => {
      const iframeStyle = await getIframeStyle(view);
      return expect(iframeStyle).to.equal('height: 0px;');
    });
  });

  it('on key input it opens the dropdown', async function () {
    const query = 'test';

    withHistory([]);
    await mockSearch({});

    await fillIn({
      query,
      view,
      testUtils,
    });

    await waitForAsync(async () => {
      const iframeStyle = await getIframeStyle(view);
      return expect(iframeStyle).to.not.equal('height: 0px;');
    });
  });
}
