/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import md5 from '../../core/helpers/md5';

import { EphemerId } from './schema';

import { Moment } from 'moment';

// The idea here is to return a value of type string
// which rotates every n * unit. So 'n * days' or
// 'n * weeks' or 'n * months' depending on the requested
// ephemerid in the schema. The value is "year-aligned",
// meaning it rotates always on the first day, week,
// or month of the year (even if n units are not over yet).
function getAbsolute(
  today: Moment,
  unit: EphemerId['unit'],
  n: EphemerId['n'],
): string {
  switch (unit) {
    case 'day': {
      return `${today.year()}-${Math.floor((today.dayOfYear() - 1) / n)}`;
    }
    case 'week': {
      // TODO: This breaks sometimes for the last week in a year,
      //       for example `moment('2019-12-30').isoWeek()` returns 1
      //       (not 52), thus the value ('2019-1') is the same for
      //       the first and the last week of 2019.
      return `${today.year()}-${Math.floor((today.isoWeek() - 1) / n)}`;
    }
    case 'month': {
      return `${today.year()}-${Math.floor(today.month() / n)}`;
    }
  }
}

// The idea is to keep the ephemerid stable for n days
// after an offset, for example the install date.
function getRelative(
  today: Moment,
  n: EphemerId['n'],
  offset: Moment,
): string {
  return `${Math.floor(today.diff(offset, 'days') / n)}`;
}

export default function({
  installDate,
  kind,
  n,
  name,
  session,
  today,
  unit,
}: {
  // Unique session ID (never shared with backend)
  session: string;

  // Information about schema requesting ID
  name: string;

  // Information about schema
  unit: EphemerId['unit'];
  n: EphemerId['n'];
  kind: EphemerId['kind'];

  // Server-synchronized current date (i.e YYYY-MM-DD)
  today: Moment;

  // Install date for current user.
  installDate: Moment;
}): string {
  // An ephemeral ID is a combined hash of 'session' (unique for each user but
  // never shared with backend), 'name' (the name of the signal requesting
  // the ID) and rotation seed based on the date (relative or absolute).

  if (kind === 'absolute') {
    return md5(`${name}${session}${getAbsolute(today, unit, n)}`).slice(0, 10);
  }

  if (unit !== 'day') {
    throw new Error(`Relative ephemerid requires 'day' as unit, but '${unit}' was provided.`);
  }

  return md5(`${name}${session}${getRelative(today, n, installDate)}`).slice(0, 10);
}
