/* eslint { "no-param-reassign": "off" } */

import moment from '../platform/moment';

import { utils } from '../core/cliqz';
import Database from '../core/database';
import events from '../core/events';
import { randomInt } from '../core/crypto/random';

import BehaviorAggregator from './aggregator';
import GIDManager from './gid-manager';
import Preprocessor /* , { parseABTests } */ from './preprocessor';
import SignalQueue from './signals-queue';
import Storage from './storage';
import analyses from './analyses';
import generateRetentionSignals from './analyses/retention';
import logger from './logger';
import getSynchronizedDate, { DATE_FORMAT } from './synchronized-date';


export default class {
  constructor(settings) {
    this.settings = settings;

    // Store available schemas for telemetry signals.
    // New schemas can be added using 'registerSchemas', which is
    // needed before they can be used using the telemetry function.
    this.availableSchemas = new Map();

    // The preprocessor is used to process incoming telemetry signals (from
    // `log` method). It is able to: convert environment signals to new
    // demographics, create legacy signals if no schema is provided, check
    // telemetry schema if provided. It will also handle instantPush signals so
    // that they are sent straight away.
    this.preprocessor = new Preprocessor(this.settings);

    // Storage for behavioral data (telemetry) and demographics (environment)
    this.behaviorStorage = new Storage(new Database('cliqz-anolysis-behavior'));
    this.demographicsStorage = new Storage(new Database('cliqz-anolysis-demographics'));

    // Storage to keep track of what days have been aggregated and sent to
    // backend.
    this.aggregationLogDB = new Database('cliqz-anolysis-aggregation-log');

    // Storage to keep track of when retention signals have been generated and sent.
    this.retentionLogDB = new Database('cliqz-anolysis-retention-log');

    // This is used to aggregate telemetry signals over 1 day. The result is
    // passed as an argument to the different analyses to generate telemetry
    // signals.
    this.behaviorAggregator = new BehaviorAggregator();

    // Async message queue used to send telemetry signals to the backend
    // (telemetry server). It is persisted on disk, and will make sure that
    // messages are sent by batch, so that we can control the throughput.
    this.messageQueue = new SignalQueue(new Storage(new Database('cliqz-anolysis-signals')));

    // Manage demographics and safe group ids. This will ensure that the user
    // reports safely at any point of time. The `getGID` method of this object
    // will be called before sending any telemetry to check for an existing GID.
    this.gidManager = new GIDManager(
      this.demographicsStorage,
      { get: utils.getPref, set: utils.setPref, clear: utils.clearPref },
    );
  }

  init() {
    // Wait for some demographics to be registered to generate any signals.
    this.onDemographicsRegistered = events.subscribe(
      'anolysis:demographics_registered',
      () => {
        // Stop listening to this event
        this.onDemographicsRegistered.unsubscribe();
        this.onDemographicsRegistered = undefined;

        // This can be run async since calling two times the same method will
        // resolve to the same Promise object. It's not returned there to not
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
          .then(() => this.generateAnalysesSignalsFromAggregation());
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
          this.generateAnalysesSignalsFromAggregation();
        }
      }
    });

    // This will delete older signals async
    // We don't need to wait for this.
    Promise.all([
      this.removeOldDataFromDB(),
      this.messageQueue.init(),
    ]);
  }

  stop() {
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

    this.messageQueue.unload();
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
    ]);
  }

  registerSchemas(schemas) {
    return new Promise((resolve, reject) => {
      Object.keys(schemas).forEach((name) => {
        const schema = schemas[name];
        logger.log(`Register schema ${name}`);
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
          reject(`Schema ${name} already exists with value ${JSON.stringify(schema)}`);
        }
      });

      resolve();
    });
  }

  removeOldDataFromDB() {
    // Get rid of data older than 30 days
    return Promise.all([
      this.behaviorStorage
        .deleteByTimespan({ to: getSynchronizedDate().subtract(1, 'months').format(DATE_FORMAT) })
        .catch(err => logger.error(`error deleting old behavior data: ${err}`)),
      this.demographicsStorage
        .deleteByTimespan({ to: getSynchronizedDate().subtract(1, 'months').format(DATE_FORMAT) })
        .catch(err => logger.error(`error deleting old behavior data: ${err}`)),
    ]);
  }

  sendRetentionSignals() {
    return this.retentionLogDB.get('retention')
      .catch((err) => {
        // Create default document
        if (err.name === 'not_found') {
          return {
            _id: 'retention',
            daily: {},
            weekly: {},
            monthly: {},
          };
        }

        // On other error we just re-throw the error
        throw err;
      })
      .then((doc) => {
        logger.log(`generate retention signals ${JSON.stringify(doc)}\n`);
        const promise = Promise.all(generateRetentionSignals(doc).map(([schema, signal]) => {
          logger.debug(`Retention signal ${JSON.stringify(signal)} (${schema})`);
          return this.handleTelemetrySignal(signal, schema);
        }));

        // Doc is updated by the `generateRetentionSignals` function to keep
        // track of the current activity, and avoid generating the signals
        // several times.
        return this.retentionLogDB.put(doc).then(() => promise);
      });
  }

  generateAnalysesSignalsFromAggregation() {
    const startDay = getSynchronizedDate().subtract(1, 'days');
    const stopDay = getSynchronizedDate().subtract(1, 'months');

    const checkPast = (formattedDate) => {
      const date = moment(formattedDate, DATE_FORMAT);
      return this.aggregationLogDB.get(formattedDate)
        .then(() => { /* We already processed this day before, do nothing */ })
        .catch(() =>
          this.generateAndSendAnalysesSignalsForDay(formattedDate)
            .then(() => this.aggregationLogDB.put({ _id: formattedDate }))
            .catch((ex) => {
              logger.error(`could not generate aggregated signals for day ${formattedDate}: ${ex}`);
            })
        ).then(() => {
          // Recursively check previous day until we reach `stopDay`
          if (stopDay.isBefore(date, 'day')) {
            // Wait a few seconds between each aggregation, to not overload the
            // browser.
            return new Promise((resolve, reject) => {
              this.generateAggregationSignalsTimeout = utils.setTimeout(
                () => checkPast(date.subtract(1, 'days').format(DATE_FORMAT))
                  .catch(() => reject())
                  .then(() => resolve()),
                5000);
            });
          }

          return Promise.resolve();
        });
    };

    return checkPast(startDay.format(DATE_FORMAT));
  }

  /**
   * This function is triggered by anacron every day, once a day (and can be
   * triggered later if it was missed for a given day). It will read one day
   * of behavioral signals, aggregate it, and then invoke different analyses
   * to generate messages to be sent to the backend. The messages will be
   * stored temporarily in a queue (persisted on disk), and then sent async.
   */
  generateAndSendAnalysesSignalsForDay(date) {
    // 1. Aggregate messages for one day
    const timespan = { from: date, to: date };
    return this.behaviorStorage.getTypesByTimespan(timespan)
      .then((records) => {
        // Ignore days with no records
        if (records.length === 0) return Promise.resolve();

        const t0 = Date.now();
        const aggregation = this.behaviorAggregator.aggregate(records);
        const total = Date.now() - t0;

        // Delete signals and only keep aggregation
        return this.behaviorStorage.deleteByTimespan(timespan)
          .then(() => this.behaviorStorage.put({
            ts: date,
            _id: `aggregation_${date}`,
            aggregation,
          }))
          .catch((err) => { logger.error(`error while inserting aggregatin ${err}`); })
          .then(() => {
            // Extract AB Tests
            // This is not used at the moment, so let's not do useless work
            // const abtests = new Set(parseABTests(utils.getPref('ABTests')));

            // 3. Generate messages for each analysis
            logger.log(`generateSignals ${date}`);
            return Promise.all(analyses.map((analysis) => {
              logger.debug(`generateSignals for ${analysis.name}`);
              return Promise.all(analysis.generateSignals(aggregation /* , abtests */)
                .map((signal) => {
                  logger.debug(`Signal for ${analysis.name} ${JSON.stringify(signal)}`);
                  return this.handleTelemetrySignal(
                    Object.assign(signal, {
                      meta: {
                        date,
                        // TODO: This will be removed in the future. The aggregation
                        // time could also be sent separately in its own signal.
                        aggregation_time: total,
                      },
                    }),
                    analysis.name,
                  );
                }));
            }));
          });
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
    logger.debug(`handleTelemetrySignal ${schemaName} ${JSON.stringify(signal)}`);
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
          logger.debug(`Signal is instantPush ${JSON.stringify(processedSignal)}`);
          return this.gidManager.getGID()
            .then((gid) => {
              // Attach id to the message
              processedSignal.id = schemaName;

              if (schema.needs_gid) {
                processedSignal.meta.gid = gid;
              } else {
                // NOTE: If `gid` is empty, it's also fine, as we still want
                // to receive signals for users not having a safe GID. In
                // this case, such users will form a group on their own.
                processedSignal.meta.gid = '';
              }

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
                processedSignal.meta.date
                || getSynchronizedDate().format(DATE_FORMAT));

              // Push signal to be sent as soon as possible.
              this.messageQueue.push(processedSignal);
            });
        }

        // if (!isInstantPush || isLegacy) {
        // This signal is stored and will be aggregated with other signals from
        // the same day to generate 'analyses' signals.
        return this.behaviorStorage.put(processedSignal)
          .catch((ex) => { logger.error(`behavior exception ${ex}`); });
        // }
      });
  }
}
