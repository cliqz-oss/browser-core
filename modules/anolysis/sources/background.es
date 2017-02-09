/* eslint { "object-shorthand": "off" } */

import Anacron from 'core/anacron';
import Database from 'core/database';
import background from 'core/base/background';
import md5 from 'core/helpers/md5';
import { utils } from 'core/cliqz';

import BehaviorAggregator from 'anolysis/aggregator';
import GIDManager from 'anolysis/gid-manager';
import Preprocessor, { parseABTests } from 'anolysis/preprocessor';
import SignalQueue from 'anolysis/signals-queue';
import Storage from 'anolysis/storage';
import analyses from 'anolysis/analyses';
import log from 'anolysis/logging';


// Version is computed as a sum of hashes from current analyses
const ANOLYSIS_VERSION = (() => {
  const analysesSignatures = analyses.map(analysis => analysis.schema || analysis.name);
  return md5(analysesSignatures.join('///'));
})();


const ONE_MINUTE = 60000;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;

const ENABLE_PREF = 'telemetryNoSession';


function isTelemetryEnabled() {
  return utils.getPref(ENABLE_PREF, false);
}


export default background({
  enabled() { return true; },

  init(settings) {
    this.isRunning = false;
    this.settings = settings;

    // Initialize the module
    if (isTelemetryEnabled()) {
      this.start();
    }
  },

  start() {
    if (this.isRunning) return;

    // Used to manage async jobs (generating signals, sending
    // signals, etc.).
    this.anacron = new Anacron(
      { get: utils.getPref, set: utils.setPref }, // storage
      { name: 'anolysis.anacron' },              // options
    );


    /* STEP 1 - Receive telemetry signal
     * Register a telemetry listener
     */
    this.telemetryHandler = this.events['telemetry:log'].bind(this);
    utils.telemetryHandlers.push(this.telemetryHandler);


    /* STEP 2 - Process telemetry signal
     * Used by `telemetry:log` callback to processing incoming signals
     */
    log(`SETTINGS ${JSON.stringify(this.settings)}`);
    this.preprocessor = new Preprocessor(this.settings);


    /* STEP 3 - Persist processed signal
     */
    this.behaviorStorage = new Storage(new Database('cliqz-telemetry-behavior'));
    this.demographicsStorage = new Storage(new Database('cliqz-telemetry-demographics'));


    /* [async]
     * STEP 4 - Aggregate signal from 1 day of data at the end of the day
     */
    this.anacron.schedule(this.actions.generateSignals.bind(this), '0 0');

    // Used for testing
    // this.intervalTimer = utils.setInterval(
    //   () => this.actions.generateSignals(Date.now()),
    //   ONE_MINUTE);

    this.behaviorAggregator = new BehaviorAggregator();


    /* [async]
     * STEP 5 - Send signals to telemetry backend
     */
    this.messageQueue = new SignalQueue(new Storage(new Database('cliqz-anolysis-signals')));


    /* [async]
     * Get rid of data older than 30 days
     */
    this.behaviorStorage
      .deleteByTimespan({ to: Date.now() - (30 * ONE_DAY) })
      .catch(err => utils.log(`error deleting old behavior data: ${err}`));

    this.demographicsStorage
      .deleteByTimespan({ to: Date.now() - (30 * ONE_DAY) })
      .catch(err => utils.log(`error deleting old behavior data: ${err}`));

    /* Make sure user reports with a safe GID
     * This `gidManager` will be used everytime a GID is needed.
     */
    this.gidManager = new GIDManager(this.demographicsStorage);

    this.anacron.start();
    this.isRunning = true;

    utils.log('started', 'anon');
  },

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    this.messageQueue.unload();

    // unsubscribe telemetry listener
    const index = utils.telemetryHandlers.indexOf(this.telemetryHandler);
    if (index > -1) {
      utils.telemetryHandlers.splice(index, 1);
      delete this.telemetryHandler;
    }

    this.anacron.stop();
    utils.log('stopped', 'anon');
  },

  unload() {
    this.stop();
  },

  beforeBrowserShutdown() {
  },

  events: {
    /**
     * @event telemetry:log
     * @param data
     */
    'telemetry:log'(data) {
      if (!this.isRunning) return;

      // No telemetry in private windows
      if (data.type !== 'environment' && utils.isPrivate()) return;

      this.actions.log(data);
    },

    /**
     * Monitor preference changes in about:config and check if we should
     * enable or disable the telemetry module.
     */
    'prefchange'(pref) {
      if (pref !== ENABLE_PREF) return;

      if (utils.getPref('telemetryNoSession', false)) {
        this.start();
      } else {
        this.stop();
      }
    },
  },

  actions: {
    /**
     * This function is triggered by anacron every day, once a day (and can be
     * triggered later if it was missed for a given day). It will read one day
     * of behavioral signals, aggregate it, and then invoke different analyses
     * to generate messages to be sent to the backend. The messages will be
     * stored temporarily in a queue (persisted on disk), and then sent async.
     */
    generateSignals(date) {
      // 1. Aggregate messages for one day
      const timespan = { from: date - ONE_DAY, to: date };
      this.behaviorStorage.getTypesByTimespan(timespan)
        .then((records) => {
          const aggregation = this.behaviorAggregator.aggregate(records);

          // Extract AB Tests
          const abtests = new Set(parseABTests(utils.getPref('ABTests')));

          // 2. Get current group id to report with
          this.gidManager.getGID()
            .then((gid) => {
              if (gid === '') {
                log('No GID available to send analyses');
              } else {
                log(`GID: ${gid}`);
              }

              // 3. Generate messages for each analysis
              log(`generateSignals ${date}`);
              analyses.forEach((analysis) => {
                log(`generateSignals for ${analysis.name}`);
                analysis.generateSignals(aggregation, abtests)
                  .forEach((signal) => {
                    log(`Signal for ${analysis.name} ${JSON.stringify(signal)}`);
                    const decoratedSignal = Object.assign(signal, {
                      meta: {
                        // TODO: This is temporary! Should be removed before
                        // putting in production. This will be there as long
                        // as we test both telemetry systems side by side, to
                        // be able to compare results meaningfully.
                        session: utils.getPref('session'),
                        date,
                        timespan,
                        report: Date.now(),
                        version: ANOLYSIS_VERSION,
                      },
                    });

                    // Check if we should attach a GID
                    if (analysis.needs_gid) {
                      // NOTE: If `gid` is empty, it's also fine, as we still want
                      // to receive signals for users not having a safe GID. In
                      // this case, such users will form a group on their own.
                      decoratedSignal.meta.gid = gid;
                    } else {
                      decoratedSignal.meta.gid = '';
                    }

                    this.messageQueue.push(decoratedSignal);
                  });
              });
            });
        });
    },

    /**
     * Process a new incoming telemetry signal from `core`. It will be
     * transformed to new telemetry (without ID) format and stored. The
     * data will then be available for aggregation and sent as part of
     * daily analyses.
     *
     * @param {Object} signal - The telemetry signal.
     */
    log(signal) {
      // TODO: Some analyses could send signals in real time. (eg: retention)
      const processedSignal = this.preprocessor.process(signal);
      if (processedSignal.demographics) {
        this.gidManager.updateDemographics(processedSignal);
      } else {
        this.behaviorStorage.put(processedSignal)
          .catch((ex) => { log(`behavior exception ${ex}`); });
      }
    },
  },
});
