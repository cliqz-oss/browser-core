/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import config from '../../core/config';
import { fetchLocal } from '../fetch';

export default function () {
  const url = `${config.baseURL}core/logo-database.json`;
  return fetchLocal(url).then(response => response.json());
}
