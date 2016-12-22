import Anacron from 'core/anacron';
import Behavior from 'telemetry/aggregators/behavior';
import Database from 'core/database';
import Demographics from 'telemetry/aggregators/demographics';
import Preprocessor from 'telemetry/preprocessor';
import Reporter from 'telemetry/reporter';
import ResourceLoader from 'core/resource-loader';
import Retention from 'telemetry/aggregators/retention';
import Storage from 'telemetry/storage';
import Tree from 'telemetry/tree';
import background from 'core/base/background';
import { utils } from 'core/cliqz';

const ONE_MINUTE = 60000;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ENABLE_PREF = 'telemetryNoSession';

export default background({
  enabled() { return true; },

  init(settings) {
    this.behaviorStorage = new Storage(new Database('cliqz-telemetry-behavior'));
    this.demographicsStorage = new Storage(new Database('cliqz-telemetry-demographics'));
    // TODO: rename the following 3 to *Aggregator
    this.behavior = new Behavior();
    this.rentention = new Retention();
    this.demographics = new Demographics();
    this.preprocessor = new Preprocessor(settings);
    this.reporter = new Reporter(this.behaviorStorage, this.demographicsStorage);
    this.isRunning = false;

    this.loader = new ResourceLoader(
      ['telemetry', 'trees.json'],
      {
        remoteURL: 'https://cdn.cliqz.com/telemetry/trees.json',
        cron: ONE_DAY,
      }
    );

    this.anacron = new Anacron({
      get: utils.getPref,
      set: utils.setPref,
    }, {
      name: 'telemetry.anacron',
    });
    // TODO: re-enable for production
    // this.actions.schedule('20-min-behavior', this.behavior,
    //   '*/20 *', 20 * ONE_MINUTE);
    this.actions.schedule('daily-behavior', this.behavior,
      '0 0', ONE_DAY);
    this.actions.schedule('daily-retention', this.rentention,
      '0 0', 30 * ONE_DAY, ONE_DAY);

    if (utils.getPref(ENABLE_PREF, false)) {
      this.start();
    }
  },

  start() {
    if (this.isRunning) return;

    this.loader.load().then((trees) => {
      this.demographics.trees = { };
      Object.keys(trees).forEach((key) => {
        this.demographics.trees[key] = new Tree();
        this.demographics.trees[key].insertNodes(trees[key]);
      });
    });

    this.telemetryHandler = this.events['telemetry:log'].bind(this);
    utils.telemetryHandlers.push(this.telemetryHandler);

    // TODO: move somewhere else (e.g., to storage as auto-delete setting)
    this.behaviorStorage
      .deleteByTimespan({ to: Date.now() - 30 * ONE_DAY })
      .catch(err => utils.log(`error deleting old behavior data: ${err}`));

    // TODO: move somewhere else (e.g., to storage as auto-delete setting)
    this.demographicsStorage
      .deleteByTimespan({ to: Date.now() - 30 * ONE_DAY })
      .catch(err => utils.log(`error deleting old behavior data: ${err}`));

    this.anacron.start();

    this.isRunning = true;
    utils.log(`started`, 'anon');
  },

  stop() {
    if (!this.isRunning) return;

    // unsubscribe
    const index = utils.telemetryHandlers.indexOf(this.telemetryHandler);
    if (index > -1) {
      utils.telemetryHandlers.splice(index, 1);
      delete this.telemetryHandler;
    }

    this.anacron.stop();
    this.loader.stop();
    this.isRunning = false;
    utils.log(`stopped`, 'anon');
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

      // no telemetry in private windows
      if (data.type != 'environment' && utils.isPrivate()) return;

      // don't insert summary reports
      if (!data._report) this.actions.log(data);
    },
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
    * Schedule a telemtry report.
    * @example
    * schedule('20-min-behavior', behavior, '* /20 *', 20 * ONE_MINUTE)
    * schedule('daily-retention', retention, '0 0', 30 * ONE_DAY, ONE_DAY)
    * @param {string} id - The report ID (e.g., 'daily-retention').
    * @param {Aggregator} aggregator - The signal aggregator.
    * @param {string} pattern - The cron pattern (e.g., '0 0' for daily report at midnight).
    * @param {number} interval - The total timespan covered in the report (in ms).
    * @param {number} retention - The retention interval (in ms) or null for non-retention reports.
    */
    // TODO: add test
    // TODO: derive interval from pattern
    // TODO: rename `interval` to `timespan`? `retention` => `interval`?
    schedule(id, aggregator, pattern, interval, retention = null) {
      this.anacron.schedule(date => {
        utils.log(`start ${id}`, 'anon');
        const start = Date.now();
        this.reporter
          .createMessages(aggregator, this.demographics,
            { from: date - interval, to: date }, retention)
          .then(messages => {
            const stop = Date.now();
            messages.forEach(msg => {
              // don't re-insert these messages into telemetry (filtered in environment)
              msg._report = true;
              msg.type = 'anon';
              msg.id = id;
              msg.meta = {
                // the report date and time
                report: date.getTime(),
                // TODO: use a date format that can be easily parsed (instead of timestamps)
                start,
                stop,
                duration: stop - start,
                version: '0.1',
              };
              utils.log(`stop ${id}`, 'anon');
              utils.telemetry(msg);
            });
          })
          .catch(error => utils.log(error, 'telemetry'));
      }, pattern);
    },

    /**
    * Log a telemetry signal.
    * @param {Object} signal - The telemetry signal.
    */
    // TODO: add test
    log(signal) {
      const processedSignal = this.preprocessor.process(signal);
      // TODO: use 'type' instead of 'id'
      const id = processedSignal.id;
      if (id === '_demographics') {
        this.demographicsStorage.put(processedSignal);
      } else {
        this.behaviorStorage.put(processedSignal);
      }
    },
  },
});
