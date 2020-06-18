/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default function InstalFF({ onClick }) {
  return (
    <div className="info-block">
      <div className="info-block-content">
        <div className="info-headline firefox  welcome-headline">
          <div>Firefox</div>
          <div className="welcome-description">
            Do you already have Firefox installed?
            If not, please install from <a href="https://download-installer.cdn.mozilla.net/pub/firefox/releases/76.0.1/mac/de/Firefox%2076.0.1.dmg" target="_blank" rel="noopener noreferrer">here</a>
          </div>
        </div>
      </div>
      <div className="info-block-ctrl">
        <button
          type="button"
          className="welcome-ctrl-content"
          data-index="1"
          onClick={() => onClick(2)}
        >
          Yes I have Firefox Installed
        </button>
      </div>
    </div>
  );
}
