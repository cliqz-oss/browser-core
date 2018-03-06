/* eslint { "no-param-reassign": "off" } */

// TODO - introduce an in-memory short-lived cache to store signals to behavior
// db and signal db. Then use one bulkAdd to insert all of them at once.
// TODO - ease addition of new analyses
import moment from '../platform/lib/moment';

import { utils } from '../core/cliqz';
import events from '../core/events';
import { randomInt } from '../core/crypto/random';

import BehaviorAggregator from './aggregator';
import GIDManager from './gid-manager';
import Preprocessor /* , { parseABTests } */ from './preprocessor';
import SignalQueue from './signals-queue';
import Storage from './storage';
import generateRetentionSignals from './analyses/retention';
import logger from './logger';
import getSynchronizedDate, { DATE_FORMAT } from './synchronized-date';


export default class Anolysis {
  constructor(settings) {
    // Store available schemas for telemetry signals.
    // New schemas can be added using 'registerSchemas', which is
    // needed before they can be used using the telemetry function.
    this.availableSchemas = new Map();

    // The preprocessor is used to process incoming telemetry signals (from
    // `log` method). It is able to: convert environment signals to new
    // demographics, create legacy signals if no schema is provided, check
    // telemetry schema if provided. It will also handle instantPush signals so
    // that they are sent straight away.
    this.preprocessor = new Preprocessor(settings);

    // Storage manages databases for all Anolysis storage.
    this.storage = new Storage();

    // This is used to aggregate telemetry signals over 1 day. The result is
    // passed as an argument to the different analyses to generate telemetry
    // signals.
    this.behaviorAggregator = new BehaviorAggregator();

    // Async message queue used to send telemetry signals to the backend
    // (telemetry server). It is persisted on disk, and will make sure that
    // messages are sent by batch, so that we can control the throughput.
    this.signalQueue = new SignalQueue();

    // Manage demographics and safe group ids. This will ensure that the user
    // reports safely at any point of time. The `getGID` method of this object
    // will be called before sending any telemetry to check for an existing GID.
    this.gidManager = new GIDManager(
      { get: utils.getPref, set: utils.setPref, clear: utils.clearPref },
    );
  }

  init() {
    return this.storage.init()
      .then(() => this.signalQueue.init(this.storage.signals))
      .then(() => {
        // Check everytime we switch to a new day, and trigger the generation of
        // aggregated telemetry signals (analyses).
        let currentDate = utils.getPref('config_ts');
        this.onNewDate = events.subscribe('prefchange', (pref) => {
          if (pref === 'config_ts') {
            const newValue = utils.getPref('config_ts');
            if (newValue !== currentDate) {
              currentDate = newValue;
              logger.log('Generate aggregated signals (new day)', currentDate, newValue);
              this.generateAnalysesSignalsFromAggregation();
            }
          }
        });
      })
      .then(() => {
        // This can be run async since calling two times the same method will
        // resolve to the same Promise object. It's not returned here to not
        // delay the loading of the module.
        this.gidManager.init();
      });
  }

  unload() {
    if (this.onNewDate) {
      this.onNewDate.unsubscribe();
      this.onNewDate = undefined;
    }

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
    return Promise.all([
      this.gidManager.reset(),
      this.storage.destroy(),
    ]);
  }

  registerSchemas(schemas) {
    Object.keys(schemas).forEach((name) => {
      logger.debug('Register schema', name);
      if (!this.availableSchemas.has(name)) {
        this.availableSchemas.set(name, schemas[name]);
      } else {
        throw new Error(`Schema ${name} already exists with value ${JSON.stringify(schemas[name])}`);
      }
    });
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
        let aggregation = {};
        const signals = [];
        const numberOfSignals = records.size;
        logger.log('generateSignals', date, numberOfSignals);

        // Generate signals from analyses which do not require an aggregation
        // first. This can happen if the data is coming from other sources such
        // as preferences, but we still want to trigger those only once a day.
        this.availableSchemas.forEach((schema, name) => {
          if (schema.generate !== undefined && schema.generate.length === 0) {
            logger.debug('generateSignals for', name);
            schema.generate().forEach(signal => signals.push({
              schema: { ...schema, instantPush: true },
              signal,
              meta: { date },
            }));
          }
        });

        // Aggregate signals if there is at least one, then generate anolysis
        // signals based on this aggregation.
        if (numberOfSignals > 0) {
          const t0 = Date.now();
          aggregation = this.behaviorAggregator.aggregate(records);
          const total = Date.now() - t0;

          // Extract AB Tests
          // This is not used at the moment, so let's not do useless work
          // const abtests = new Set(parseABTests(utils.getPref('ABTests')));

          this.availableSchemas.forEach((schema, name) => {
            // Only consider schemas having a signal generator specified.
            if (schema.generate !== undefined && schema.generate.length > 0) {
              logger.debug('generateSignals for', name);
              schema.generate(aggregation /* , abtests */).forEach(signal =>
                signals.push({
                  schema: { ...schema, instantPush: true },
                  signal,
                  meta: {
                    date,
                    // TODO: This will be removed in the future. The aggregation
                    // time could also be sent separately in its own signal.
                    aggregation_time: total,
                  },
                })
              );
            }
          });
        }

        // Push all signals to telemetry queue
        return Promise.all(signals.map(({ signal, schema, meta }) =>
          this.handleTelemetrySignal(signal, schema, meta)
        )).then(() => this.storage.aggregated.storeAggregation(date, aggregation))
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
  handleTelemetrySignal(signal, schemaName, meta = {}) {
    logger.debug('handleTelemetrySignal', schemaName, signal);

    // Try to fetch the schema definition from the name.
    let schema;
    let name;
    if (typeof schemaName === 'string') {
      schema = this.availableSchemas.get(schemaName);
      if (schema === undefined) {
        return Promise.reject(`Telemetry schema ${schemaName} was not found`);
      }
      name = schemaName;
    } else if (schemaName !== undefined) {
      // A schema object can be given directly as argument
      schema = schemaName;
      name = schema.name;
    }

    return this.preprocessor.process(signal, schema, name)
      .then((processedSignal) => {
        const isDemographics = processedSignal.demographics !== undefined;
        const isLegacy = schema === undefined;
        const isInstantPush = !isLegacy && schema.instantPush;

        if (isDemographics) {
          // The environment signal from legacy telemetry is ignored, since we
          // now have a cross-platform mechanism to get demographics.
          return Promise.resolve();
        } else if (isInstantPush && !isLegacy) {
          logger.debug('Signal is instantPush', processedSignal);

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
              processedSignal.meta.session = utils.getPref('session');

              processedSignal.meta.date = (
                processedSignal.meta.date ||
                getSynchronizedDate().format(DATE_FORMAT)
              );

              // Push signal to be sent as soon as possible.
              return this.signalQueue.push(processedSignal);
            });
        }

        // if (!isInstantPush || isLegacy) {
        // This signal is stored and will be aggregated with other signals from
        // the same day to generate 'analyses' signals.
        return this.storage.behavior.add(processedSignal);
        // }
      });
  }
}
