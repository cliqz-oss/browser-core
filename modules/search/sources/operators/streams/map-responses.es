/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';

export default (operator, config) => pipe(map(({ responses, ...result }) => ({
  ...result,
  responses: responses.map(response => operator(response, config)),
})));
