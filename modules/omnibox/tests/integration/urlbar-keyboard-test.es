/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  urlbar,
  blurUrlBar,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  waitForPopupClosed,
  win,
  withHistory,
  setUrlbarSelection,
  press,
  newTab,
} from './helpers';

import { getResourceUrl } from '../../../tests/core/integration/helpers';

export default function () {
  describe('using keyboard in urlbar', function () {
    const query = 'facebook';
    const domain = `${query}.com`;
    const url = `https://${domain}`;
    const freshtabUrl = getResourceUrl('freshtab/home.html');

    before(async function () {
      win.preventRestarts = true;
      await newTab(freshtabUrl, { focus: true });
    });

    after(async () => {
      win.preventRestarts = false;
    });

    context('restore original urlbar value', () => {
      beforeEach(async function () {
        await blurUrlBar();
        await mockSearch({ results: [{ url }] });
        withHistory([]);
        fillIn(query);
        await waitForPopup(1, 2000);
      });

      it('on pressing Escape', async () => {
        press({ key: 'Escape' });
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === '';
        });
      });
    });

    context('close dropdown', () => {
      beforeEach(async () => {
        await blurUrlBar();
        await mockSearch({ results: [{ url }] });
        withHistory([]);
        fillIn(query);
        await waitForPopup(1);
      });

      it('on pressing Escape', async () => {
        press({ key: 'Escape' });
        await waitForPopupClosed();
      });

      it('on pressing ArrowLeft', async () => {
        press({ key: 'ArrowLeft' });
        await waitForPopupClosed();
      });

      it('on pressing ArrowRight', async () => {
        press({ key: 'ArrowRight' });
        await waitForPopupClosed();
      });

      it('on deleting query', async () => {
        await setUrlbarSelection(0, domain.length);
        await press({ key: 'Backspace' });
        await waitForPopupClosed();
      });
    });

    context('user selection', () => {
      beforeEach(async () => {
        await blurUrlBar();
        withHistory([]);
      });

      it('should be expanded user when autocomplete arrives (EX-6780)', async () => {
        await mockSearch({ results: [{ url }] }, 500);
        await fillIn(query);
        await setUrlbarSelection(0, query.length);
        await waitFor(async () => {
          const selectionStart = await urlbar.selectionStart;
          const selectionEnd = await urlbar.selectionEnd;
          return selectionStart === 0 && selectionEnd === domain.length;
        });
      });

      it('should be correctly replaced when edited (EX-7058)', async () => {
        await mockSearch({ results: [] });
        fillIn('https://onedrive.live.com/about/en-us/');
        await waitForPopup();
        await setUrlbarSelection(26, 31);
        await press({ key: 'a', code: 'KeyA' });
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === 'https://onedrive.live.com/a/en-us/';
        });
      });

      it('should be correctly replaced when edited (EX-9348)', async () => {
        await mockSearch({ results: [] });
        fillIn('www');
        await waitForPopup();
        await setUrlbarSelection(0, 3);
        await press({ key: 'w', code: 'KeyW' });
        await waitFor(async () => {
          const urlbarValue = await urlbar.textValue;
          return urlbarValue === 'w';
        });
      });
    });

    context('open dropdown', async () => {
      beforeEach(async () => {
        await blurUrlBar();
        await mockSearch({ results: [{ url }] });
        withHistory([{ value: url }]);
      });

      const UP_DOWN = ['ArrowUp', 'ArrowDown'];
      const LEFT_RIGHT = ['ArrowLeft', 'ArrowRight'];

      UP_DOWN.forEach((key) => {
        it(`for empty query on pressing ${key}`, async () => {
          fillIn('');
          await press({ key });
          await waitForPopup(1);
        });

        it(`for non-empty query on pressing ${key}`, async () => {
          fillIn(query);
          await press({ key });
          await waitForPopup(2);
        });

        LEFT_RIGHT.forEach((key2) => {
          it(`on pressing ${key} after ${key2} (EX-9349)`, async () => {
            fillIn(query);
            await press({ key });
            await waitForPopup(2);
            await press({ key: key2 });
            await waitForPopupClosed();
            await press({ key });
            await waitForPopup(2);
          });
        });
      });
    });
  });
}
