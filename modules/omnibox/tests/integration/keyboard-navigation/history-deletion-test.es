/* global sinon */

import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  press,
  release,
  urlbar,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from '../helpers';

export default function () {
  describe('keyboard tests for deletion of history results', function () {
    const query = 'fa';
    const url1 = 'https://facebook.com';
    const friendlyUrl1 = 'facebook.com';
    const url2 = 'https://faz.com';
    const url3 = 'https://faz.com/test/';
    let sandbox;
    let history;

    beforeEach(async function () {
      history = win.CLIQZ.TestHelpers.history;
      sandbox = sinon.sandbox.create();

      await blurUrlBar();
      withHistory([{ value: url1 }, { value: url2 }]);
      await mockSearch({ results: [] });
      fillIn(query);
      await waitForPopup(3);
      await waitFor(async () => {
        const urlbarValue = await urlbar.textValue;
        return urlbarValue === friendlyUrl1;
      });
    });

    afterEach(function () {
      sandbox.restore();
      release({ key: 'Shift', code: 'ShiftLeft' });
      release({ key: 'Alt', code: 'AltLeft' });
      release({ key: 'Control', code: 'ControlLeft' });
    });

    it('press "Shift + Backspace" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      sandbox.spy(history, 'removeFromBookmarks');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Backspace', shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`));
      expect(history.removeFromHistory).to.have.been.called;
      expect(history.removeFromBookmarks).to.have.been.called;
    });

    it('press "Shift + Delete" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      sandbox.spy(history, 'removeFromBookmarks');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Delete', shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`));
      expect(history.removeFromHistory).to.have.been.called;
      expect(history.removeFromBookmarks).to.have.been.called;
    });

    it('press "Alt + Shift + Backspace" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      sandbox.spy(history, 'removeFromBookmarks');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Backspace', altKey: true, shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`));
      expect(history.removeFromHistory).to.have.been.called;
      expect(history.removeFromBookmarks).to.have.been.called;
    });

    it('press "Alt + Shift + Delete" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      sandbox.spy(history, 'removeFromBookmarks');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Delete', altKey: true, shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`));
      expect(history.removeFromHistory).to.have.been.called;
      expect(history.removeFromBookmarks).to.have.been.called;
    });

    it('press "Ctrl + Shift + Backspace" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      sandbox.spy(history, 'removeFromBookmarks');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Backspace', ctrlKey: true, shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`));
      expect(history.removeFromHistory).to.have.been.called;
      expect(history.removeFromBookmarks).to.have.been.called;
    });

    it('press "Ctrl + Shift + Delete" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      sandbox.spy(history, 'removeFromBookmarks');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Delete', ctrlKey: true, shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`));
      expect(history.removeFromHistory).to.have.been.called;
      expect(history.removeFromBookmarks).to.have.been.called;
    });
  });
}
