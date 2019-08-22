/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { getResourceUrl } from '../../../core/platform';

function ToolsShortcuts() {
  return (
    <div>
      <a
        href={getResourceUrl('search/mixer.html')}
        rel="noopener noreferrer"
        tabIndex="-1"
        target="_blank"
      >
        OPEN MIXER TOOL
      </a>
      <br />
      <a
        href={getResourceUrl('search/mixer.html?onlyhistory=true')}
        rel="noopener noreferrer"
        tabIndex="-1"
        target="_blank"
      >
        OPEN HISTORY TOOL
      </a>
      <br />
      <a
        href={getResourceUrl('anolysis-cc/index.html')}
        rel="noopener noreferrer"
        tabIndex="-1"
        target="_blank"
      >
        OPEN ANOLYSIS TOOL
      </a>
      <br />
      <a
        href={getResourceUrl('adblocker/index.html')}
        rel="noopener noreferrer"
        tabIndex="-1"
        target="_blank"
      >
        OPEN ADBLOCKER TOOL
      </a>
    </div>
  );
}

export default ToolsShortcuts;
