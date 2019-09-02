/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import App from './toolbox/components/app';
import checkIfChromeReady from '../core/content/ready-promise';

(async function start() {
  await checkIfChromeReady();

  ReactDOM.render(
    React.createElement(App, {}, null),
    document.getElementById('root')
  );
}());
