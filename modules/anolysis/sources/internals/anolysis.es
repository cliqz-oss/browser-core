/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */

import moment from '../../platform/lib/moment';

import prefs from '../../core/prefs';
import { randomInt } from '../../core/crypto/random';

import GIDManager from './gid-manager';
import Preprocessor from './preprocessor';
import SignalQueue from './signals-queue';
import Task from './task';
import getSynchronizedDate, { DATE_FORMAT } from './synchronized-date';
import logger from './logger';
import updateRetentionState from './retention';


export default class Anolysis {
  constructor(config) {
    this.running = false;
    this.currentDate = null;

    // Store available definitions for telemetry signals. New definitions can
    // be added using 'registerSignalDefinitions', which is needed before they
    // can be used using the telemetry function.
    this.availableDefinitions = new Map();

    // The preprocessor is used to process incoming telemetry signals (from
    // `log` method). It is able to: convert environment signals to new
    // demographics, create legacy signals if no schema is provided, check
    // telemetry schema if provided. It will also handle instantPush signals so
    // that they are sent straight away.
    this.preprocessor = new Preprocessor();

    // Storage manages databases for all Anolysis storage.
    const Storage = config.get('Storage');
    this.storage = new Storage();

    // Async message queue used to send telemetry signals to the backend
    // (telemetry server). It is persisted on disk, and will make sure that
    // messages are sent by batch, so that we can control the throughput.
    this.signalQueue = new SignalQueue(config);

    // Manage demographics and safe group ids. This will ensure that the user
    // reports safely at any point of time. The `getGID` method of this object
    // will be called before sending any telemetry to check for an existing GID.
    this.gidManager = new GIDManager(config);
  }

  async init() {
    await this.storage.init();
    await Promise.all([
      this.gidManager.init(this.storage.gid),
      this.signalQueue.init(this.storage.signals),
    ]);
    this.running = true;
  }

  unload() {
    clearTimeout(this.runTasksTimeout);
    this.signalQueue.unload();
    this.storage.unload();
    this.running = false;
  }

  /**
   * WARNING: This method will only be used during the release of the system. It
   * will only be triggered on a version change, to allow existing
   * users (who could be using a previously buggy version of anolysis) to be
   * updated completely and be put in a safe state.
   */
  reset() {
    // Clear state related to gid management + out-going messages that could be
    // sent with a GID that does not exist anymore.
    return this.storage.destroy();
  }

  registerSignalDefinitions(definitions) {
    definitions.forEach((definition) => {
      const name = definition.name;
      logger.debug('Register definition', name);
      if (!this.availableDefinitions.has(name)) {
        this.availableDefinitions.set(name, new Task(definition));
      } else {
        throw new Error(`Signal ${name} already exists with value ${JSON.stringify(definition)}`);
      }
    });
  }

  async onNewDay(date) {
    if (date !== this.currentDate) {
      // This can be run async since calling two times the same method will
      // resolve to the same Promise object.
      this.gidManager.getGID();

      logger.log(
        'Generate aggregated signals (new day)',
        this.currentDate,
        date,
      );
      this.currentDate = date;

      await this.updateRetentionState();

      logger.log('Run aggregation tasks');
      await this.runDailyTasks();
    }
  }

  async updateRetentionState() {
    const state = await this.storage.retention.getState();
    logger.debug('retention state', state);

    // `state` is updated by the `updateRetentionState` function to keep
    // track of the current activity. This state will be made available to
    // aggregation tasks.
    await this.storage.retention.setState(updateRetentionState(state));
  }

  async runDailyTasks() {
    let offset = 0; // offset 0 means 'today', offset 1 = 'yesterday', etc.
    const startDay = getSynchronizedDate();
    const stopDay = moment.max(
      moment(this.gidManager.getNewInstallDate(), DATE_FORMAT),
      getSynchronizedDate().subtract(30, 'days'),
    );

    let date = startDay;
    while (this.running && stopDay.isSameOrBefore(date, 'day')) {
      const formattedDate = date.format(DATE_FORMAT);

      try {
        await this.runTasksForDay(formattedDate, offset);
      } catch (ex) {
        logger.error('Could not run tasks for day', formattedDate, ex);
      }

      // Wait a few seconds before aggregating the next day, to not overload the
      // browser.
      await new Promise((resolve) => {
        this.runTasksTimeout = setTimeout(resolve, 5000);
      });

      date = date.subtract(1, 'days');
      offset += 1;
    }
  }

  /**
   * This function is triggered every day, once a day (and can be triggered
   * later if it was missed for a given day). It will read one day of behavioral
   * signals, aggregate it, and then invoke different analyses to generate
   * messages to be sent to the backend. The messages will be stored temporarily
   * in a queue (persisted on disk), and then sent async.
   */
  async runTasksForDay(date, offset) {
    // Retrieve retention state to be used by analyses. Because the
    // retention state is already updated with the activity of today, it means
    // that aggregation for past days have access "to the future" of the user.
    const retention = await this.storage.retention.getState();

    // Most of the time, aggregations will be performed using metrics from the
    // past (usually from the previous day). An `offset` of value 0 means that
    // we are running an aggregation task for the current day; consequently,
    // metrics are not fully collected and it is not possible to get access to
    // the metrics, as they would give a partial (and wrong) view of the user's
    // activity. You can still access retention data though. This is useful for
    // a few things:
    //
    // 1. generating retention signals, which needs to happen every day as soon
    // as possible and we do not need to access metrics from the past.
    // 2. sending activity signals (similar to retention)
    // 3. emitting metrics from aggregation functions (e.g.: abtest metrics).
    let records = null;
    let numberOfSignals = 0;
    if (offset !== 0) {
      // Collect all behavioral signals for `date`, grouped by type.
      records = await this.storage.behavior.getTypesForDate(date);
      numberOfSignals = records.size;
    }

    logger.debug('generateSignals', {
      date,
      numberOfSignals,
      offset,
    });

    // We only need to run aggregations function in two cases:
    // 1. If `offset` is 0, which means we run tasks for the current day and do
    // not need any behavior information (see comment above)
    // 2. Or we are interested in behavior/metrics from the past (offset > 0).
    if (offset === 0 || numberOfSignals !== 0) {
      const definitions = [...this.availableDefinitions.entries()];
      for (let i = 0; i < definitions.length; i += 1) {
        const [name, task] = definitions[i];

        // Check that `task` should run for the current day offset. For offset
        // 0, we usually only run tasks which will emit metrics or "instant"
        // signals (no need for aggregation), and for offset > 0 we will perform
        // aggregations using behavioral data from a previous day (offset = 1 is
        // yesterday, offset = 2 is the day before yesterday, etc.).
        if (task.shouldGenerateForOffset(offset)) {
          try {
            await this.storage.aggregated.runTaskAtMostOnce(date, name, async () => {
              logger.debug('run task', name, offset);
              const signals = await task.generate({
                date,
                dateMoment: moment(date, DATE_FORMAT),
                records,
                retention,
              });

              await Promise.all(signals.map(
                signal => this.handleTelemetrySignal(signal, name, { date }))
              );
            });
          } catch (ex) {
            logger.log('Could not genereate signals for analysis:', name, ex);
          }
        }
      }
    }

    // We should not delete behavior metrics if the offset is `0`, because the
    // day is not over, and they will be needed the next active day to generate
    // aggregations.
    if (offset !== 0) {
      await this.storage.behavior.deleteByDate(date);
    }
  }

  /**
   * Process a new incoming telemetry signal from `core`. It will be
   * transformed to new telemetry (without ID) format and stored. The
   * data will then be available for aggregation and sent as part of
   * daily analyses.
   *
   * @param {Object} signal - The telemetry signal.
   */
  handleTelemetrySignal(signal, signalName, meta = {}) {
    logger.debug('handleTelemetrySignal', signalName, signal);

    // Try to fetch the schema definition from the name.
    let schema;
    let name;
    if (signalName !== undefined) {
      schema = this.availableDefinitions.get(signalName);
      if (schema === undefined) {
        logger.debug(`Telemetry schema ${signalName} was not found`);
        // Calls to telemetry() are usually not catched or waited for, so we
        // log an error and ignore this signal if the schema name was not found.
        // This avoids having unhandled promise rejections.
        return Promise.resolve();
      }
      name = signalName;
    } else {
      // Ignore signals without a schema
      logger.debug('Ignoring telemetry signal without schema', signal);
      return Promise.resolve();
    }

    return this.preprocessor.process(signal, schema, name)
      .then((processedSignal) => {
        const isDemographics = processedSignal.demographics !== undefined;
        const isLegacy = schema === undefined;
        const isSendToBackend = !isLegacy && schema.sendToBackend;

        if (isDemographics) {
          // The environment signal from legacy telemetry is ignored, since we
          // now have a cross-platform mechanism to get demographics.
          return Promise.resolve();
        } else if (isSendToBackend && !isLegacy) {
          logger.debug('Signal is sendToBackend', processedSignal);

          return (schema.needsGid ? this.gidManager.getGID() : Promise.resolve(''))
            .then((gid) => {
              processedSignal.meta = meta;

              // NOTE: If `gid` is empty, it's also fine, as we still want
              // to receive signals for users not having a safe GID. In
              // this case, such users will form a group on their own.
              processedSignal.meta.gid = gid;

              // TODO - it might be enough to hash the signal + date of
              // generation to detect exact duplicates (could be done in the
              // backend). But this seed can allow us to detect issues in
              // the client.
              //
              // We add a random seed to each message to allow deduplication
              // from the backend. This should not be a privacy concern, as each
              // message will include a different number.
              processedSignal.meta.seed = randomInt();

              // TODO: This is temporary! Should be removed before
              // putting in production. This will be there as long
              // as we test both telemetry systems side by side, to
              // be able to compare results meaningfully.
              processedSignal.meta.session = prefs.get('session');

              // This allows us to filter out signals coming from developers
              // in the backend. This is not privacy breaching because all
              // normal users will have `false` as value for this attribute.
              processedSignal.meta.dev = prefs.get('developer', false);

              // Allow versioning of signals.
              processedSignal.meta.version = schema.version;

              // The date for this signal is either the date of the data/metrics
              // which were aggregated to create it via an analysis, or the date
              // of today if it was not specified yet.
              processedSignal.meta.date = (
                processedSignal.meta.date ||
                getSynchronizedDate().format(DATE_FORMAT)
              );

              // Push signal to be sent as soon as possible.
              return this.signalQueue.push(processedSignal);
            });
        }

        // if (!isSendToBackend || isLegacy) {
        // This signal is stored and will be aggregated with other signals from
        // the same day to generate 'analyses' signals.
        return this.storage.behavior.add(processedSignal);
        // }
      });
  }
}
