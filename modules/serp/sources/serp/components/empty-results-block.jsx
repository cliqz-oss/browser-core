/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default () => (
  <div
    className="searchbox-results-empty"
  >
    <p>
      Für diese Suchanfrage haben wir leider keine passenden Ergebnisse gefunden.
    </p>

    <ul
      className="searchbox-results-empty-list"
    >
      <li>
        Achte darauf, dass alle Wörter richtig geschrieben sind
      </li>
      <li>
        Probiere es mit anderen Suchbegriffen
      </li>
    </ul>
  </div>
);
