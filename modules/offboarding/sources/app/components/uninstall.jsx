/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default function Uninstall({ onClick }) {
  return (
    <div className="info-block">
      <div className="info-block-content">
        <div className="info-headline welcome-headline">
          <div>Uninstall Cliqz</div>
          <div className="welcome-description">
            You now need to uninstall Cliqz.
          </div>
        </div>
      </div>
      <div className="info-block-ctrl">
        <button
          type="button"
          className="welcome-ctrl-content"
          data-index="1"
          onClick={() => onClick(4)}
        >
          Uninstall finished
        </button>
      </div>
    </div>
  );
}
