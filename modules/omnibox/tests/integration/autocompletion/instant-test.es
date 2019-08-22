/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  urlbar,
  waitForPopup,
  withHistory,
} from '../helpers';

export default function () {
  describe('no autocompletion for instant results', function () {
    const query = 'goog';

    before(async function () {
      await blurUrlBar();
    });

    beforeEach(async function () {
      withHistory([]);
      await mockSearch({ results: [] });
      fillIn(query);
      await waitForPopup();
    });

    it('for query that matches default search engine url there is no completion on instant result', async function () {
      expect(await urlbar.textValue).to.equal(query);
      expect(await urlbar.selectionStart).to.equal(query.length);
      expect(await urlbar.selectionEnd).to.equal(query.length);
    });
  });
}
