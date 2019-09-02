/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  expect,
  sleep,
  CliqzEvents,
} from '../../../tests/core/integration/helpers';

export default function () {
  describe.skip('content-script', () => {
    let mdSubscription = null;

    afterEach(() => {
      mdSubscription.unsubscribe();
    });

    function onMousedown(callback) {
      mdSubscription = CliqzEvents.subscribe('core:mouse-down', () => {
        callback();
      });
    }

    function triggerMousedown() {
      document.body.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true
      }));
    }

    it('message can be received', (done) => {
      onMousedown(() => {
        done();
      });
      triggerMousedown();
    });

    it('single message should not arrive more than once after extension restart', (done) => {
      let messageCount = 0;
      onMousedown(() => { messageCount += 1; });

      sleep(500).then(() => {
        try {
          expect(messageCount).to.equal(1);
          done();
        } catch (e) {
          done(e);
        }
      });

      triggerMousedown();
    });
  });
}
