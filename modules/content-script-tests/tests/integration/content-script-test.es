/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  app,
  expect,
  newTab,
  wait,
  waitFor,
} from '../../../tests/core/integration/helpers';
import { isWebExtension, isMobile } from '../../../core/platform';

export default function () {
  if (isWebExtension !== true || isMobile === true) {
    return;
  }

  describe('registerContentScript', function () {
    const mod = app.modules['content-script-tests'].background;

    // spy
    let listener;
    let called;

    beforeEach(() => {
      called = [];
      listener = (...args) => {
        called.push(args);
      };
      mod.listener = listener;
    });

    context('module is enabled', () => {
      it('triggers content script on matching page', async () => {
        await newTab('http://example.com');
        await waitFor(() => expect(called).to.have.length(1));
        expect(called[0]).to.be.eql([{
          a: 42,
          test: true,
        }]);
      });

      it('does not run when page does not match', async () => {
        await newTab('https://cliqz.com');
        await wait(1500);
        expect(called).to.have.length(0);
      });

      it('does not run when page matches pattern from excludeMatches', async () => {
        await newTab('http://example.com?foo=42');
        await wait(1500);
        expect(called).to.have.length(0);
      });

      it('can call content scripts actions', async () => {
        const args = ['foo', 'bar', 'baz'];
        const tabId = await newTab('http://example.com');

        const callContentAction = () => app.modules.core.background.actions.callContentAction(
          'content-script-tests',
          'action1',
          { windowId: tabId },
          ...args,
        );

        // Wait for window to exist
        const promises = [];
        const receivingEndDoesNotExist = 'Could not establish connection. Receiving end does not exist.';
        while (promises.length === 0) {
          try {
            // eslint-disable-next-line no-await-in-loop
            promises.push(await callContentAction());
          } catch (ex) {
            if (JSON.stringify(ex).includes(receivingEndDoesNotExist) === false
              && (`${ex}`).includes(receivingEndDoesNotExist) === false
            ) {
              throw ex;
            }
          }
        }

        // Make one call every 1ms
        for (let i = 0; i < 40; i += 1) {
          promises.push(callContentAction());
          // eslint-disable-next-line no-await-in-loop
          await wait(1);
        }

        for (const result of (await Promise.all(promises))) {
          expect(result).to.eql(args);
        }
      });
    });

    context('module is disabled', () => {
      beforeEach(() => app.disableModule('content-script-tests'));
      afterEach(() => app.enableModule('content-script-tests'));

      it('does not run content script', async () => {
        await newTab('http://example.com');
        await wait(1500);
        expect(called).to.have.length(0);
      });
    });
  });
}
