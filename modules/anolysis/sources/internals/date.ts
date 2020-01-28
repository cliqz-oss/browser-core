/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import moment from 'moment';

const CONFIG_DATE_FORMAT = /^[0-9]{8}$/;
const BACKEND_DATE_FORMAT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/**
 * This class exposes a safe API to manipulate immutable dates in `anolysis`.
 * Initialization of `SafeDate` can only be performed after validation of input
 * format and only a handful of public methods are offered.
 */
export default class SafeDate {
  public static fromConfig(date: string): SafeDate {
    if (typeof date !== 'string' || date.length !== 8 || CONFIG_DATE_FORMAT.test(date) === false) {
      throw new Error(`cannot parse date in config_ts format: ${date}`);
    }

    return new SafeDate(moment(date, 'YYYYMMDD'));
  }

  public static fromBackend(date: string): SafeDate {
    if (
      typeof date !== 'string' ||
      date.length !== 10 ||
      BACKEND_DATE_FORMAT.test(date) === false
    ) {
      throw new Error(`cannot parse date in backend format: ${date}`);
    }

    return new SafeDate(moment(date, 'YYYY-MM-DD'));
  }

  constructor(
    private readonly date: moment.Moment,
  ) {}

  public toString(): string {
    return this.date.format('YYYY-MM-DD');
  }

  public toDayString(): string {
    return this.toString();
  }

  public toWeekString(): string {
    return this.date.format('YYYY-WW');
  }

  public toMonthString(): string {
    return this.date.format('YYYY-M');
  }

  public isSameDay(date: SafeDate): boolean {
    return this.date.isSame(date.date, 'day');
  }

  public isBeforeDay(date: SafeDate): boolean {
    return this.date.isBefore(date.date, 'day');
  }

  public subDays(days: number): SafeDate {
    return new SafeDate(this.date.clone().subtract(days, 'days'));
  }

  public isSameOrBeforeDay(date: SafeDate): boolean {
    return this.date.isSameOrBefore(date.date);
  }

  public offset(date: SafeDate): number {
    return Math.abs(this.date.diff(date.date, 'days'));
  }
}
