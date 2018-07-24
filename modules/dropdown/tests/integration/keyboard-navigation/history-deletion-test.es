/* global getWindow, sinon */

import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  press,
  release,
  testsEnabled,
  urlbar,
  waitFor,
  withHistory } from '../helpers';

export default function () {
  if (!testsEnabled()) { return; }

  describe('keyboard tests for deletion of history results', function () {
    const query = 'fa';
    const url1 = 'https://facebook.com';
    const friendlyUrl1 = 'facebook.com';
    const url2 = 'https://faz.com';
    const url3 = 'https://faz.com/test/';
    let sandbox;
    let history;

    beforeEach(async function () {
      history = getWindow().CLIQZ.TestHelpers.history;
      sandbox = sinon.sandbox.create();
      blurUrlBar();
      withHistory([{ value: url1 }, { value: url2 }]);
      await mockSearch({ results: [] });
      fillIn(query);
      await waitFor(() => urlbar.textValue === friendlyUrl1);
    });

    afterEach(function () {
      sandbox.restore();

      release({ key: 'Shift', code: 'ShiftLeft' });
      release({ key: 'Alt', code: 'AltLeft' });
      release({ key: 'Control', code: 'ControlLeft' });
    });

    it('press "Shift + Backspace" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Backspace', shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`) !== null);
      expect(history.removeFromHistory).to.have.been.called;
    });

    it('press "Shift + Delete" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Delete', shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`) !== null);
      expect(history.removeFromHistory).to.have.been.called;
    });

    it('press "Alt + Shift + Backspace" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Backspace', altKey: true, shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`) !== null);
      expect(history.removeFromHistory).to.have.been.called;
    });

    it('press "Alt + Shift + Delete" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Delete', altKey: true, shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`) !== null);
      expect(history.removeFromHistory).to.have.been.called;
    });

    it('press "Ctrl + Shift + Backspace" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Backspace', ctrlKey: true, shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`) !== null);
      expect(history.removeFromHistory).to.have.been.called;
    });

    it('press "Ctrl + Shift + Delete" -> removeFromHistory and new search were triggered', async function () {
      sandbox.spy(history, 'removeFromHistory');
      withHistory([{ value: url2 }, { value: url3 }]);
      await mockSearch({ results: [] });
      press({ key: 'Delete', ctrlKey: true, shiftKey: true });
      await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url3}"]`) !== null);
      expect(history.removeFromHistory).to.have.been.called;
    });
  });
}
