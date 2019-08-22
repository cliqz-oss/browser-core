/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global describeModule */

const moment = require('moment');
const mockDexie = require('../../../../core/unit/utils/dexie');
const storageTests = require('./impl');

const DATE_FORMAT = 'YYYY-MM-DD';
let currentDate = '2017-01-01';
const setCurrentDate = (date) => { currentDate = date; };
const getCurrentMoment = () => moment(currentDate, DATE_FORMAT);
const getFormattedCurrentDate = () => getCurrentMoment().format(DATE_FORMAT);

export default describeModule('anolysis/internals/storage/dexie',
  () => ({
    ...mockDexie,
    'anolysis/internals/synchronized-date': {
      DATE_FORMAT,
      default() {
        return getCurrentMoment();
      },
    },
    'anolysis/internals/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
  }),
  () => {
    let Storage = null;

    beforeEach(function () {
      if (Storage === null) {
        Storage = this.module().default;
      }
    });

    describe('Run tests', function () {
      storageTests({
        DATE_FORMAT,
        getCurrentMoment,
        getFormattedCurrentDate,
        setCurrentDate,
        getStorage: () => Storage,
        forceReloadDuringTests: true,
      });
    });
  });
