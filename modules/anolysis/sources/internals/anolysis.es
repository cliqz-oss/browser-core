/* eslint-disable no-param-reassign */

import moment from '../../platform/lib/moment';

import prefs from '../../core/prefs';
import { randomInt } from '../../core/crypto/random';
import { utils } from '../../core/cliqz';

import GIDManager from './gid-manager';
import Preprocessor /* , { parseABTests } */ from './preprocessor';
import SignalQueue from './signals-queue';
import generateRetentionSignals from './retention';
import getSynchronizedDate, { DATE_FORMAT } from './synchronized-date';
import logger from './logger';

import { loadSignalDefinition } from '../analyses-utils';


export default class Anolysis {
  constructor(config) {
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

  init() {
    return this.storage.init()
      .then(() => {
        // This can be run async since calling two times the same method will
        // resolve to the same Promise object. It's not returned here to not
        // delay the loading of the module.
        this.gidManager.init(this.storage.gid);
        this.gidManager.updateState();
      })
      .then(() => this.signalQueue.init(this.storage.signals));
  }

  unload() {
    utils.clearTimeout(this.generateAggregationSignalsTimeout);
    this.signalQueue.unload();
    this.storage.unload();
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
        this.availableDefinitions.set(name, loadSignalDefinition(definition));
      } else {
        throw new Error(`Signal ${name} already exists with value ${JSON.stringify(definition)}`);
      }
    });
  }

  onNewDay(date) {
    if (date !== this.currentDate) {
      logger.log(
        'Generate aggregated signals (new day)',
        this.currentDate,
        date,
      );
      this.currentDate = date;

      // 1. Trigger sending of retention signals if needed
      // This can be done as soon as possible, the first time
      // the user starts the browser, at most once a day.
      //
      // 2. Then we check previous days (30 days max) to aggregate and send
      // telemetry if the user was not active. This task is async and will try to
      // not overload the browser.
      return this.sendRetentionSignals()
        .then(() => {
          logger.log('Generate aggregated signals');
          return this.generateAnalysesSignalsFromAggregation();
        });
    }

    return Promise.resolve();
  }

  sendRetentionSignals() {
    return this.storage.retention.getState().then((state) => {
      logger.log('generate retention signals', state);

      const promise = Promise.all(generateRetentionSignals(state).map(([schema, signal]) =>
        this.handleTelemetrySignal(signal, schema)
      ));

      // `state` is updated by the `generateRetentionSignals` function to keep
      // track of the current activity, and avoid generating the signals
      // several times.
      return this.storage.retention.setState(state).then(() => promise);
    });
  }

  generateAnalysesSignalsFromAggregation() {
    const startDay = getSynchronizedDate().subtract(1, 'days');
    const stopDay = moment.max(
      moment(this.gidManager.getNewInstallDate(), DATE_FORMAT),
      getSynchronizedDate().subtract(30, 'days'),
    );

    // If we are on the day of install, we should not even try to aggregate the
    // past. For subsequent days, the recursion of `checkPast` will stop either
    // 30 days ago, or at the date of install.
    if (startDay.isBefore(stopDay, 'days')) {
      return Promise.resolve();
    }

    const checkPast = (formattedDate) => {
      const date = moment(formattedDate, DATE_FORMAT);
      return this.storage.aggregated.ifNotAlreadyAggregated(formattedDate, () =>
        this.generateAndSendAnalysesSignalsForDay(formattedDate)
          .catch(ex => logger.error('Could not generate aggregated signals for day', formattedDate, ex))
          .then(() => {
            // Recursively check previous day until we reach `stopDay`
            if (stopDay.isBefore(date, 'day')) {
              // Wait a few seconds between each aggregation, to not overload
              // the browser.
              // NOTE: This could be done in a worker, asynchronously.
              return new Promise((resolve, reject) => {
                this.generateAggregationSignalsTimeout = utils.setTimeout(
                  () => checkPast(date.subtract(1, 'days').format(DATE_FORMAT))
                    .catch(reject)
                    .then(resolve),
                  5000);
              });
            }

            return Promise.resolve();
          }));
    };

    return checkPast(startDay.format(DATE_FORMAT));
  }

  /**
   * This function is triggered every day, once a day (and can be triggered
   * later if it was missed for a given day). It will read one day of behavioral
   * signals, aggregate it, and then invoke different analyses to generate
   * messages to be sent to the backend. The messages will be stored temporarily
   * in a queue (persisted on disk), and then sent async.
   */
  generateAndSendAnalysesSignalsForDay(date) {
    // 1. Aggregate messages for one day
    return this.storage.behavior.getTypesForDate(date)
      .then((records) => {
        const signals = [];
        const numberOfSignals = records.size;
        logger.log('generateSignals', date, numberOfSignals);

        // If there are signals available, generate analyses signals out of them.
        if (numberOfSignals > 0) {
          this.availableDefinitions.forEach((schema, name) => {
            // Only consider schemas having a signal generator specified.
            if (schema.generate !== undefined) {
              logger.debug('generateSignals for', name);
              schema.generate({ records /* , abtests */ }).forEach(signal =>
                signals.push({
                  name,
                  signal,
                  meta: {
                    date,
                  },
                })
              );
            }
          });
        }

        // TODO - this could be done in a Dexie transaction to avoid data-loss.
        // Push all signals to telemetry queue
        return Promise.all(signals.map(({ signal, name, meta }) =>
          this.handleTelemetrySignal(signal, name, meta)
        )).then(() => this.storage.aggregated.storeAggregation(date))
          .then(() => this.storage.behavior.deleteByDate(date));
      });
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
    if (typeof signalName === 'string') {
      schema = this.availableDefinitions.get(signalName);
      if (schema === undefined) {
        logger.error(`Telemetry schema ${signalName} was not found`);
        // Calls to telemetry() are usually not catched or waited for, so we
        // log an error and ignore this signal if the schema name was not found.
        // This avoids having unhandled promise rejections.
        return Promise.resolve();
      }
      name = signalName;
    } else if (signalName !== undefined) {
      // A schema object can be given directly as argument
      // TODO - this should probably be removed?
      schema = signalName;
      name = schema.name;
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
