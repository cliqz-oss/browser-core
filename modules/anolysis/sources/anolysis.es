/* eslint { "no-param-reassign": "off" } */

import moment from '../platform/lib/moment';

import { utils } from '../core/cliqz';
import events from '../core/events';
import { randomInt } from '../core/crypto/random';
import PouchDB from '../core/database';

import BehaviorAggregator from './aggregator';
import GIDManager from './gid-manager';
import Preprocessor /* , { parseABTests } */ from './preprocessor';
import SignalQueue from './signals-queue';
import Storage from './storage';
import analyses from './analyses';
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

    // Storage for behavioral data (telemetry): granular (before aggregation)
    // and aggregated (once the signals have been generated and sent)
    this.behaviorStorage = new Storage('cliqz-anolysis-behavior');
    this.aggregatedBehaviorStorage = new Storage('cliqz-anolysis-aggregated-behavior');

    // Storage to keep track of when retention signals have been generated and sent.
    this.retentionLogDB = new PouchDB('cliqz-anolysis-retention-log', {
      revs_limit: 1,          // Don't keep track of all revisions of a document
      auto_compaction: true,  // Get rid of deleted revisions
    });

    // This is used to aggregate telemetry signals over 1 day. The result is
    // passed as an argument to the different analyses to generate telemetry
    // signals.
    this.behaviorAggregator = new BehaviorAggregator();

    // Async message queue used to send telemetry signals to the backend
    // (telemetry server). It is persisted on disk, and will make sure that
    // messages are sent by batch, so that we can control the throughput.
    this.messageQueue = new SignalQueue(new Storage('cliqz-anolysis-signals'));

    // Manage demographics and safe group ids. This will ensure that the user
    // reports safely at any point of time. The `getGID` method of this object
    // will be called before sending any telemetry to check for an existing GID.
    this.gidManager = new GIDManager(
      { get: utils.getPref, set: utils.setPref, clear: utils.clearPref },
    );
  }

  init() {
    // Wait for some demographics to be registered to generate any signals.
    this.onDemographicsRegistered = events.subscribe(
      'anolysis:demographics_registered',
      () => {
        // It can happen that the extension restarts when the event is sent,
        // which could result in `this.onDemographicsRegistered` being
        // `undefined` because `unload` would be called just before.
        if (this.onDemographicsRegistered !== undefined) {
          // Stop listening to this event
          this.onDemographicsRegistered.unsubscribe();
          this.onDemographicsRegistered = undefined;

          // This can be run async since calling two times the same method will
          // resolve to the same Promise object. It's not returned here to not
          // delay the loading of the module.
          this.gidManager.init();

          // 1. Trigger sending of retention signals if needed
          // This can be done as soon as possible, the first time
          // the user starts the browser, at most once a day.
          //
          // 2. Then we check previous days (30 days max) to aggregate and send
          // telemetry if the user was not active. This task is async and will try to
          // not overload the browser.
          this.sendRetentionSignals()
            .then(() => {
              logger.log('Generate aggregated signals');
              return this.generateAnalysesSignalsFromAggregation();
            });
        }
      },
    );

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

    // Init different storages
    return Promise.all([
      this.aggregatedBehaviorStorage.init(),
      this.behaviorStorage.init(),
      this.messageQueue.init(),
    ]).then(() => this.removeOldDataFromDB());
  }

  unload() {
    if (this.onDemographicsRegistered) {
      this.onDemographicsRegistered.unsubscribe();
      this.onDemographicsRegistered = undefined;
    }

    if (this.onNewDate) {
      this.onNewDate.unsubscribe();
      this.onNewDate = undefined;
    }

    utils.clearTimeout(this.generateAggregationSignalsTimeout);
    utils.clearTimeout(this.asyncMessageGeneration);

    // Unload storage
    return Promise.all([
      this.aggregatedBehaviorStorage.unload(),
      this.behaviorStorage.unload(),
      this.messageQueue.unload(),
    ]);
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
      this.messageQueue.destroy(),
      this.behaviorStorage.destroy(),
    ]);
  }

  registerSchemas(schemas) {
    Object.keys(schemas).forEach((name) => {
      const schema = schemas[name];
      logger.log('Register schema', name);
      // TODO: Perform some checks on `schema`.
      // - allowed fields
      // - missing information

      // TODO: What happens if it already exists:
      // - replace
      // - error
      // - ignore
      if (!this.availableSchemas.has(name)) {
        this.availableSchemas.set(name, schema);
      } else {
        throw new Error(`Schema ${name} already exists with value ${JSON.stringify(schema)}`);
      }
    });
  }

  /**
   * Get rid of data older than 30 days.
   */
  removeOldDataFromDB() {
    return Promise.all([
      this.behaviorStorage
        .deleteByTimespan({ to: getSynchronizedDate().subtract(1, 'months').format(DATE_FORMAT) })
        .catch(err => logger.error('error deleting old behavior data:', err)),
      this.aggregatedBehaviorStorage
        .deleteByTimespan({ to: getSynchronizedDate().subtract(1, 'months').format(DATE_FORMAT) })
        .catch(err => logger.error('error deleting old behavior data:', err)),
    ]);
  }

  sendRetentionSignals() {
    return this.retentionLogDB.get('retention')
      .catch((err) => {
        // Create default document if this is the first time that retention
        // signals are generated.
        if (err.name === 'not_found') {
          return {
            _id: 'retention',
            daily: {},
            weekly: {},
            monthly: {},
          };
        }

        // On other error we just re-throw the error
        logger.error('Error while checking if retention was already sent', err);
        throw err;
      })
      .then((doc) => {
        logger.log('generate retention signals', doc);
        const promise = Promise.all(generateRetentionSignals(doc).map(([schema, signal]) => {
          logger.debug('Retention signal', signal, schema);
          return this.handleTelemetrySignal(signal, schema);
        }));

        // `doc` is updated by the `generateRetentionSignals` function to keep
        // track of the current activity, and avoid generating the signals
        // several times.
        return this.retentionLogDB.put(doc)
          .then(() => promise)
          .then(() => this.messageQueue.flush());
      });
  }

  generateAnalysesSignalsFromAggregation() {
    const startDay = getSynchronizedDate().subtract(1, 'days');
    const stopDay = getSynchronizedDate().subtract(1, 'months');

    const checkPast = (formattedDate) => {
      const date = moment(formattedDate, DATE_FORMAT);
      return this.aggregatedBehaviorStorage.get(formattedDate)
        .then(() => { /* We already processed this day before, do nothing */ })
        .catch((err) => {
          if (err.name === 'not_found') {
            // If we did not process `formattedDate` already, let's do it
            return this.generateAndSendAnalysesSignalsForDay(formattedDate)
              .catch((ex) => {
                logger.error('Could not generate aggregated signals for day', formattedDate, ex);
              });
          }

          logger.error('Error while checking if day was already aggregated', formattedDate, err);
          throw err;
        }).then(() => {
          // Recursively check previous day until we reach `stopDay`
          if (stopDay.isBefore(date, 'day')) {
            // Wait a few seconds between each aggregation, to not overload the
            // browser.
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
        });
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
    const timespan = { from: date, to: date };
    return this.behaviorStorage.getTypesByTimespan(timespan)
      .then((records) => {
        const numberOfSignals = Object.keys(records).length;
        logger.log('generateSignals', date, numberOfSignals);

        let aggregation = {};
        const signals = [];

        // Ignore days with no records
        if (numberOfSignals > 0) {
          const t0 = Date.now();
          aggregation = this.behaviorAggregator.aggregate(records);
          const total = Date.now() - t0;

          // Extract AB Tests
          // This is not used at the moment, so let's not do useless work
          // const abtests = new Set(parseABTests(utils.getPref('ABTests')));

          analyses.forEach((analysis) => {
            logger.debug('generateSignals for', analysis.name);
            analysis.generateSignals(aggregation /* , abtests */).forEach((signal) => {
              signals.push({
                analysis: analysis.name,
                signal: Object.assign(signal, {
                  meta: {
                    date,
                    // TODO: This will be removed in the future. The aggregation
                    // time could also be sent separately in its own signal.
                    aggregation_time: total,
                  },
                }),
              });
            });
          });
        }

        // Push all signals to telemetry queue
        return Promise.all(signals.map(
          signal => this.handleTelemetrySignal(signal.signal, signal.analysis)
            .catch(err => logger.error('could not push message into queue', signal, err))
        ))
        .then(() => this.messageQueue.flush().catch(ex => logger.error('error while flushing', date, ex)))
        .then(() => Promise.all([
          // Delete behavioral data for this day
          this.behaviorStorage.deleteByTimespan(timespan)
            .catch((err) => {
              logger.error('Error while deleting behavior data', date, err);
            }),

          // Store aggregation
          this.aggregatedBehaviorStorage.put({ ts: date, _id: date, aggregation })
            .catch((err) => {
              logger.error('Error while inserting aggregation', date, err);
            })
        ]));
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
  handleTelemetrySignal(signal, schemaName) {
    logger.debug('handleTelemetrySignal', schemaName, signal);

    // Try to fetch the schema definition from the name.
    let schema;
    if (schemaName !== undefined) {
      schema = this.availableSchemas.get(schemaName);
      if (schema === undefined) {
        return Promise.reject(`Telemetry schema ${schemaName} was not found`);
      }
    }

    return this.preprocessor.process(signal, schema, schemaName)
      .then((processedSignal) => {
        const isDemographics = processedSignal.demographics !== undefined;
        const isLegacy = schema === undefined;
        const isInstantPush = !isLegacy && schema.instantPush;

        if (isDemographics) {
          return this.gidManager.updateDemographics(processedSignal);
        } else if (isInstantPush && !isLegacy) {
          logger.debug('Signal is instantPush', processedSignal);

          return (schema.needs_gid ? this.gidManager.getGID() : Promise.resolve(''))
            .then((gid) => {
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
              return this.messageQueue.push(processedSignal);
            });
        }

        // if (!isInstantPush || isLegacy) {
        // This signal is stored and will be aggregated with other signals from
        // the same day to generate 'analyses' signals.
        return this.behaviorStorage.put(processedSignal, true /* buffered */)
          .catch((ex) => { logger.error('behavior exception', ex); });
        // }
      });
  }
}
