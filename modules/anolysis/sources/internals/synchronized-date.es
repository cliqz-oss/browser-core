/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getSynchronizedDate from '../../core/synchronized-time';

export { default } from '../../core/synchronized-time';

/**
 * Define standard date formats in anolysis module
 * @constant
 */
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DAY_FORMAT = 'YYYY-DDD';
export const WEEK_FORMAT = 'YYYY-WW';
export const MONTH_FORMAT = 'YYYY-M';

export function getSynchronizedDateFormatted() {
  return getSynchronizedDate().format(DATE_FORMAT);
}
