/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Promise from '../core/helpers/promise';
import App from './app';
import config from '../core/config';

global.Promise = Promise;
global.App = App;
global.config = config;
