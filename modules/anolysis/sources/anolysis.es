/* eslint { "no-param-reassign": "off" } */

import moment from 'platform/moment';

import { utils } from 'core/cliqz';
import Database from 'core/database';

import BehaviorAggregator from 'anolysis/aggregator';
import GIDManager from 'anolysis/gid-manager';
import Preprocessor, { parseABTests } from 'anolysis/preprocessor';
import SignalQueue from 'anolysis/signals-queue';
import Storage from 'anolysis/storage';
import analyses from 'anolysis/analyses';
import generateRetentionSignals from 'anolysis/analyses/retention';
import log from 'anolysis/logging';
import getSynchronizedDate, { DATE_FORMAT } from 'anolysis/synchronized-date';


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
      { get: utils.getPref, set: utils.setPref },
    );
  }

  init() {
    // Trigger sending of retention signals if needed
    // This can be done as soon as possible, the first time
    // the user starts the browser, at most once a day.
    this.asyncRetention = utils.setTimeout(
      () => this.sendRetentionSignals(),
      4000,
    );

    // This will check previous days (30 days max) to aggregate and send
    // telemetry if the user was not active. This task is async and will try to
    // not overload the browser.
    this.asyncSignals = utils.setTimeout(
      () => this.generateAnalysesSignalsFromAggregation(),
      6000,
    );

    // This can be run async since calling two times the same method will
    // resolve to the same Promise object. It's not returned there to not
    // delay the loading of the module.
    this.gidManager.init();

    return Promise.all([
      this.removeOldDataFromDB(),
      this.messageQueue.init(),
    ]);
  }

  stop() {
    utils.clearTimeout(this.asyncRetention);
    utils.clearTimeout(this.generateAggregationSignalsTimeout);
    utils.clearTimeout(this.asyncSignals);

    return this.messageQueue.unload();
  }

  registerSchemas(schemas) {
    return new Promise((resolve, reject) => {
      Object.keys(schemas).forEach((name) => {
        const schema = schemas[name];
        log(`Register schema ${name}`);
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
        .catch(err => log(`error deleting old behavior data: ${err}`)),
      this.demographicsStorage
        .deleteByTimespan({ to: getSynchronizedDate().subtract(1, 'months').format(DATE_FORMAT) })
        .catch(err => log(`error deleting old behavior data: ${err}`)),
    ]);
  }

  sendRetentionSignals() {
    const instantPushDB = new Database('cliqz-anolysis-retention-log');
    return instantPushDB.get('retention')
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
        log(`generate retention signals ${JSON.stringify(doc)}\n`);
        generateRetentionSignals(doc).forEach(([schema, signal]) => {
          this.handleTelemetrySignal(signal, schema);
        });

        // Doc is updated by the `generateRetentionSignals` function to keep
        // track of the current activity, and avoid generating the signals
        // several times.
        return instantPushDB.put(doc);
      });
  }

  generateAnalysesSignalsFromAggregation() {
    const aggregationLogDB = new Database('cliqz-anolysis-aggregation-log');
    const startDay = getSynchronizedDate().subtract(1, 'days');
    const stopDay = getSynchronizedDate().subtract(1, 'months');

    const checkPast = (formattedDate) => {
      const date = moment(formattedDate, DATE_FORMAT);
      return aggregationLogDB.get(formattedDate)
        .then(() => { /* We already processed this day before, do nothing */ })
        .catch(() => this.generateAndSendAnalysesSignalsForDay(formattedDate)
          .then(() => aggregationLogDB.put({ _id: formattedDate }))
          .catch((ex) => {
            log(`could not generate aggregated signals for day ${formattedDate}: ${ex}`);
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
        if (records.length === 0) return;

        const t0 = Date.now();
        const aggregation = this.behaviorAggregator.aggregate(records);
        const total = Date.now() - t0;

        // Extract AB Tests
        const abtests = new Set(parseABTests(utils.getPref('ABTests')));

        // 3. Generate messages for each analysis
        log(`generateSignals ${date}`);
        analyses.forEach((analysis) => {
          log(`generateSignals for ${analysis.name}`);
          analysis.generateSignals(aggregation, abtests)
            .forEach((signal) => {
              log(`Signal for ${analysis.name} ${JSON.stringify(signal)}`);
              this.handleTelemetrySignal(
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
            });
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
          log(`Signal is instantPush ${JSON.stringify(processedSignal)}`);
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
          .catch((ex) => { log(`behavior exception ${ex}`); });
        // }
      });
  }
}
