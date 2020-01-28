/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global describeModule */

const mocks = require('../../mocks');
const storageTests = require('./impl');

export default describeModule('anolysis/internals/storage/memory',
  () => ({
    ...mocks,
    'anolysis/internals/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
  }),
  () => {
    let SafeDate = null;
    let Storage = null;

    let currentDate = '2017-01-01';

    const setCurrentDate = (date) => { currentDate = date; };
    const getCurrentDate = () => SafeDate.fromBackend(currentDate);

    beforeEach(async function () {
      if (SafeDate === null) {
        SafeDate = (await this.system.import('anolysis/internals/date')).default;
      }

      if (Storage === null) {
        Storage = this.module().default;
      }
    });

    describe('Run tests', function () {
      storageTests({
        getCurrentDate,
        setCurrentDate,
        getStorage: () => new Storage(),
        forceReloadDuringTests: false,
      });
    });
  });
