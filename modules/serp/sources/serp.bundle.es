/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global window */

import React from 'react';
import ReactDOM from 'react-dom';
import App from '../core/app';
import Serp from './serp/components/index';


const CLIQZ = {};

CLIQZ.app = new App({});

window.CLIQZ = CLIQZ;
(async function start() {
  await CLIQZ.app.start();
  await CLIQZ.app.modules.core.getWindowLoadingPromise(window);

  ReactDOM.render(
    React.createElement(Serp, {}, null),
    document.getElementById('root')
  );
}());
