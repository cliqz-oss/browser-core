import {
  newTab,
  waitFor,
  expect,
} from '../../../../tests/core/integration/helpers';
import {
  mockSearch,
  withHistory,
} from '../../../../tests/core/integration/search-helpers';

export default function ({
  checkIframeExists,
  fillIn,
  getIframeStyle,
  injectTestUtils,
  testPageUrl,
  triggerIframeCreation,
  waitForTestPage,
}) {
  let tabId;
  let view;
  let testUtils;

  beforeEach(async function () {
    tabId = await newTab(testPageUrl);
    view = await waitForTestPage(tabId);
    testUtils = await injectTestUtils(view);
  });

  it('has no iframe on start', async () => expect(await checkIframeExists(view)).to.equal(false));

  it('creates iframe on demand', async function () {
    triggerIframeCreation(view);
    await waitFor(async () => expect(await checkIframeExists(view)).to.equal(true));
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

    await waitFor(async () => {
      const iframeStyle = await getIframeStyle(view);
      return expect(iframeStyle).to.not.equal('height: 0px;');
    });
  });
}
