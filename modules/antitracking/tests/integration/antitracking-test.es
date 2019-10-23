/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  app,
  checkIsWindowActive,
  closeTab,
  expect,
  newTab,
  testServer,
} from '../../../tests/core/integration/helpers';

import Config from '../../../antitracking/config';


export default function () {
  let attrack;
  let webRequestPipeline;

  describe('antitracking tests', function () {
    beforeEach(async () => {
      attrack = app.modules.antitracking.background.attrack;
      webRequestPipeline = app.modules['webrequest-pipeline'].background;

      // Try to mock app
      webRequestPipeline.unload();
      await webRequestPipeline.init({});

      attrack.unload();
      await attrack.init(new Config({}));
    });


    describe('platform/browser', () => {
      describe('#checkIsWindowActive', () => {
        it('returns false for none existant tab ids', async () => {
          expect(await checkIsWindowActive(-1)).to.be.false;
          expect(await checkIsWindowActive(0)).to.be.false;
          expect(await checkIsWindowActive(532)).to.be.false;
        });

        describe('when tab is opened', () => {
          let tabId;

          beforeEach(async () => {
            await testServer.registerPathHandler('/', { result: '<html><body><p>Hello world</p></body></html' });
            tabId = await newTab(testServer.getBaseUrl());
          });

          it('returns true for open tab id', async () => {
            expect(await checkIsWindowActive(tabId)).to.be.true;
          });

          describe('when tab is closed', () => {
            it('returns false for closed tab id', async () => {
              await closeTab(tabId);
              expect(await checkIsWindowActive(tabId)).to.be.false;
            });
          });
        });
      });
    });
  });
}
