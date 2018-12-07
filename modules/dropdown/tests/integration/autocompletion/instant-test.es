import {
  blurUrlBar,
  expect,
  fastFillIn,
  mockSearch,
  testsEnabled,
  urlbar,
  waitForPopup,
  withHistory,
} from '../helpers';

export default function () {
  if (!testsEnabled()) { return; }

  describe('no autocompletion for instant results', function () {
    const query = 'goog';

    before(function () {
      blurUrlBar();
    });

    beforeEach(async function () {
      withHistory([]);
      await mockSearch({ results: [] });
      fastFillIn(query);
      await waitForPopup(1);
    });

    it('for query that matches default serach engine url there is no completion on instant result', function () {
      expect(urlbar.mInputField.value).to.equal(query);
      expect(urlbar.selectionStart).to.equal(query.length);
      expect(urlbar.selectionEnd).to.equal(query.length);
    });
  });
}
