/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global sinon */
/* global describeModule */

const mockAnolysis = require('../mocks');

const CURRENT_DATE = '2017-01-01';

export default describeModule('anolysis/internals/anolysis',
  () => ({
    ...mockAnolysis,
    'core/console': { default: console },
    'core/services/pacemaker': {
      default: {
        register() { },
        clearTimeout() { },
        setTimeout(cb) { cb(); },
        nextIdle() {},
      },
    },
    'anolysis/internals/logger': {
      default: {
        // debug(...args) { console.log('DEBUG', ...args); },
        // log(...args) { console.log('LOG', ...args); },
        // error(...args) { console.log('ERROR', ...args); },
        debug() { },
        log() { },
        error() { },
      },
    },
  }),
  () => {
    let anolysis;

    beforeEach(async function () {
      const SafeDate = (await this.system.import('anolysis/internals/date')).default;
      const Storage = (await this.system.import('anolysis/internals/storage/memory')).default;
      const Anolysis = this.module().default;
      anolysis = new Anolysis(SafeDate.fromBackend(CURRENT_DATE), {
        backend: {
          url: '',
          post: () => {},
        },
        queue: {
          batchSize: 1,
          sendInterval: 1,
          maxAttempts: 1,
        },
        storage: new Storage(),
        signals: {
          meta: {},
        },
      });

      await anolysis.init();
      anolysis.register({
        name: 'fake',
        generate: () => [{}],
        schema: {},
      });
      anolysis.register({
        name: 'metrics.fake',
        offsets: [0],
        generate: () => [{}],
        schema: {},
      });
    });

    describe('#runDailyTasks', () => {
      let Records;

      beforeEach(async function () {
        Records = (await this.system.import('anolysis/internals/records')).Records;
      });

      it('generates no signals if no metrics', async () => {
        await anolysis.runDailyTasks();
        const dates = await anolysis.storage.aggregated.getAggregatedDates();
        chai.expect(dates.sort()).to.be.eql(['2017-01-01']); // only 'instant'
      });

      it('generates signals from empty state', async () => {
        anolysis.handleTelemetrySignal = sinon.spy(() => Promise.resolve());
        anolysis.storage.behavior.getTypesForDate = sinon.spy(
          () => Promise.resolve(new Records(new Map([
            ['freshtab.home.click.news_pagination', { index: 0 }],
          ]))),
        );

        await anolysis.runDailyTasks();
        const dates = await anolysis.storage.aggregated.getAggregatedDates();
        chai.expect(dates.sort()).to.be.eql(['2017-01-01']);
      });
    });

    describe('#runTasksForDay', () => {
      let Records;

      beforeEach(async function () {
        Records = (await this.system.import('anolysis/internals/records')).Records;
      });

      it('generates signals if there are signals for a day', () => {
        anolysis.storage.behavior.getTypesForDate = sinon.spy(
          () => Promise.resolve(new Records(new Map([
            ['freshtab.home.click.news_pagination', { index: 0 }],
          ]))),
        );
        anolysis.handleTelemetrySignal = sinon.spy(() => Promise.resolve());

        return anolysis.runTasksForDay(CURRENT_DATE, 1 /* offset */)
          .then(() => chai.expect(anolysis.storage.behavior.getTypesForDate)
            .to.have.been.calledOnce)
          .then(() => chai.expect(anolysis.handleTelemetrySignal).to.have.been.called);
      });
    });
  });
