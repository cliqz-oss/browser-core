/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// @ts-ignore
import pacemaker from '../../core/services/pacemaker';
// @ts-ignore
import MessageQueue from '../../core/message-queue';

import SignalQueue from './signals-queue';
import logger from './logger';
import {
  Schema,
  shouldGenerateForOffset,
  validate,
  isAnalysis,
  isSendToBackend,
  getDemographics,
  assertIsValidSchema,
} from './schema';
import getEphemerid from './ephemerid';
import { Records } from './records';
import { Behavior, Meta } from './signal';
import { Config } from './config';
import { PacemakerTimeout } from './types';
import { Storage } from './storage/types/storage';
import SafeDate from './date';

import internalSchemas from './internal-schemas';

import moment from 'moment';

export default class Anolysis {
  private readonly config: Config;

  private scheduledAggregationTimeout: PacemakerTimeout | null = null;
  private pendingAggregationTasks: MessageQueue = MessageQueue('tasks', () =>
    this.runDailyTasks(),
  );

  private running: boolean;
  private currentDate: SafeDate;
  private readonly availableDefinitions: Map<string, Schema>;
  private readonly storage: Storage;
  private readonly signalQueue: SignalQueue;
  private isHealthy: boolean;

  constructor(today: SafeDate, config: Config) {
    this.running = false;
    this.currentDate = today;

    // Store available definitions for telemetry signals. New definitions can
    // be added using 'registerSignalDefinitions', which is needed before they
    // can be used using the telemetry function.
    this.availableDefinitions = new Map();
    internalSchemas.forEach(schema => this.register(schema));

    // Storage manages databases for all Anolysis storage.
    this.config = config;
    this.storage = config.storage;

    // Async message queue used to send telemetry signals to the backend
    // (telemetry server). It is persisted on disk, and will make sure that
    // messages are sent by batch, so that we can control the throughput.
    this.signalQueue = new SignalQueue(config);

    // Healthy until proven otherwise!
    this.isHealthy = true;
  }

  public async init(autoPrivateMode: boolean) {
    // Try to initialize storage and run health-check.
    try {
      await this.storage.init();
      await this.storage.healthCheck();
    } catch (ex) {
      logger.error('While initializing Anolysis storage', ex);

      // We try to send a healthcheck metric to backend about this event.
      // This could fail in the unlikely situation where Network would be
      // unavailable as well.
      try {
        await this.handleTelemetrySignal(
          { context: 'storage', exception: `${ex}`, autoPrivateMode },
          'metrics.anolysis.health.exception',
          { force: true },
        );
      } catch (e) {
        logger.debug('While trying to send exception metric', e);
      }
      this.isHealthy = false;
    }

    if (this.isHealthy && this.storage.signals !== null) {
      this.signalQueue.init(this.storage.signals);
      this.running = true;
    } else {
      this.unload();
    }

    return this.isHealthy;
  }

  public unload() {
    pacemaker.clearTimeout(this.scheduledAggregationTimeout);
    this.scheduledAggregationTimeout = null;

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
  public reset() {
    // Clear state related to gid management + out-going messages that could be
    // sent with a GID that does not exist anymore.
    return this.storage.destroy();
  }

  public register(schema: Schema) {
    logger.debug('register new schema', schema);

    // Make sure that `schema` is valid!
    try {
      assertIsValidSchema(schema);
    } catch (ex) {
      logger.error('invalid schema', schema, ex);
      return;
    }

    // Log an error whenever we try to register two schemas with identical names.
    if (this.availableDefinitions.has(schema.name)) {
      logger.error('schema with name conflict detected', {
        name: schema.name,
        existing: this.availableDefinitions.get(schema.name),
        override: schema,
      });
    }

    this.availableDefinitions.set(schema.name, schema);

    // Whenever a new analysis is registered, we schedule a new aggregation for
    // past days. This allows users of Anolysis to register schemas at any
    // point of time.
    if (isAnalysis(schema)) {
      this.scheduleAggregation();
    }
  }

  public unregister(schema: Schema) {
    logger.debug('unregister new schema', schema);
    this.availableDefinitions.delete(schema.name);
  }

  public async onNewDay(date: SafeDate): Promise<void> {
    if (this.currentDate.isSameDay(date) === false) {
      logger.log(
        'Generate aggregated signals (new day)',
        this.currentDate,
        date,
      );
      this.currentDate = date;

      logger.log('Clean-up old data from storage');
      await this.storage.deleteOlderThan(this.currentDate.subDays(30));

      logger.log('Run aggregation tasks');
      this.scheduleAggregation();
    }
  }

  /**
   * Whenever we want to run aggregations for past metrics we call
   * `scheduleAggregation` which enforces that:
   *
   * 1. two aggregations cannot run concurrently (using `MessageQueue`)
   * 2. we throttle and delay start of aggregation to increase efficiency.
   *
   * This allows to handle burst of calls to `register(...)` when extension
   * starts. This also handles cases where `register(...)` is called while
   * aggregation is already running; in this case it will be queued and trigger
   * again later.
   */
  private async scheduleAggregation() {
    if (this.scheduledAggregationTimeout === null) {
      this.scheduledAggregationTimeout = pacemaker.nextIdle(async () => {
        this.scheduledAggregationTimeout = null;
        this.pendingAggregationTasks.push({});
      });
    }
  }

  private async runDailyTasks() {
    if (this.storage.behavior === null || this.storage.aggregated === null) {
      throw new Error('could not run tasks because storage is not initialized');
    }

    const startDay = this.currentDate;
    for (const date of [
      startDay,
      ...(await this.storage.behavior.getDatesWithData(startDay)),
    ]) {
      // Detect if Anolysis was disabled while aggregating. In this case we abort.
      if (!this.running) {
        break;
      }

      try {
        await this.runTasksForDay(date, date.offset(startDay));
      } catch (ex) {
        logger.error('Could not run tasks for day', date, ex);
      }
    }
  }

  /**
   * This function is triggered every day, once a day (and can be triggered
   * later if it was missed for a given day). It will read one day of behavioral
   * signals, aggregate it, and then invoke different analyses to generate
   * messages to be sent to the backend. The messages will be stored temporarily
   * in a queue (persisted on disk), and then sent async.
   */
  private async runTasksForDay(date: SafeDate, offset: number): Promise<void> {
    if (this.storage.behavior === null || this.storage.aggregated === null) {
      throw new Error('could not run tasks because storage is not initialized');
    }

    const formattedDate = date.toString();

    // Most of the time, aggregations will be performed using metrics from the
    // past (usually from the previous day). An `offset` of value 0 means that
    // we are running an aggregation schema for the current day; consequently,
    // metrics are not fully collected and it is not possible to get access to
    // the metrics, as they would give a partial (and wrong) view of the user's
    // activity.
    const records: Records =
      offset === 0
        ? new Records()
        : await this.storage.behavior.getTypesForDate(date);
    const numberOfSignals = records.size;

    logger.debug('generateSignals', {
      date: date.toString(),
      numberOfSignals,
      offset,
    });

    // We only need to run aggregations function in two cases:
    // 1. If `offset` is 0, which means we run tasks for the current day and do
    // not need any behavior information (see comment above)
    // 2. Or we are interested in behavior/metrics from the past (offset > 0).
    for (const [name, schema] of this.availableDefinitions.entries()) {
      const { generate, rate = 'day' } = schema;

      // Check that `schema` should run for the current day offset. For offset
      // 0, we usually only run tasks which will emit metrics or "instant"
      // signals (no need for aggregation), and for offset > 0 we will perform
      // aggregations using behavioral data from a previous day (offset = 1 is
      // yesterday, offset = 2 is the day before yesterday, etc.).
      if (generate !== undefined && shouldGenerateForOffset(schema, offset)) {
        try {
          await this.storage.aggregated.runTaskAtMostOnce(
            date,
            name,
            async () => {
              logger.debug('run', name, offset);
              const signals: Behavior[] = await generate({
                date: formattedDate,
                records,
              });

              await Promise.all(
                signals.map(signal =>
                  this.handleTelemetrySignal(signal, name, {
                    meta: { date: formattedDate },
                  }),
                ),
              );
            },
            rate,
          );
        } catch (ex) {
          logger.log('Could not generate signals for analysis:', name, ex);
        }
      }
    }
  }

  /**
   * Process a new incoming telemetry signal. It will be transformed to new
   * telemetry (without ID) format and stored. The data will then be available
   * for aggregation and sent as part of daily analyses.
   *
   * @param {Object} signal - The telemetry signal.
   */
  public async handleTelemetrySignal(
    signal: Behavior,
    name: string,
    {
      meta = {},
      force = false,
    }: {
      meta?: Partial<Meta>;
      force?: boolean;
    } = {},
  ): Promise<void> {
    logger.debug('handleTelemetrySignal', name, signal, { force, meta });

    const schema = this.availableDefinitions.get(name);
    if (schema === undefined) {
      throw new Error(`no schema with name ${name} was registered`);
    }

    if (
      isSendToBackend(schema) ||
      this.config.signals.meta.dev ||
      this.config.signals.meta.beta
    ) {
      const { valid, errors } = validate(schema, signal);
      if (!valid) {
        const msg = 'signal could not be validated using schema';
        logger.error(msg, signal, errors);

        throw new Error(`${msg}: got ${JSON.stringify(signal, undefined, 2)}`);
      }
    }

    if (schema.sendToBackend === undefined) {
      if (this.storage.behavior === null) {
        throw new Error(
          'could not persist metric because storage is not initialized',
        );
      }

      logger.debug('signal will be persisted locally', name, signal);
      await this.storage.behavior.add(this.currentDate, name, signal);
    } else {
      const globalConfigMeta = this.config.signals.meta;
      // The date for this signal is either the date of the data/metrics
      // which were aggregated to create it via an analysis, or the date of
      // today if it was not specified yet.
      const date =
        meta.date !== undefined ? meta.date : this.currentDate.toString();

      // Prepare ephemerid if required and if all information is available.
      let ephemerid: string | undefined;
      if (schema.sendToBackend.ephemerid !== undefined) {
        if (
          this.config.session === undefined ||
          globalConfigMeta === undefined ||
          globalConfigMeta.demographics === undefined ||
          globalConfigMeta.demographics.install_date === undefined
        ) {
          logger.error('could not generate ephemerid for signal', {
            name: schema.name,
            session: this.config.session,
            globalConfigMeta,
          });
        } else {
          ephemerid = getEphemerid({
            today: moment(date, 'YYYY-MM-DD'),
            name: schema.name,
            kind: schema.sendToBackend.ephemerid.kind,
            unit: schema.sendToBackend.ephemerid.unit,
            n: schema.sendToBackend.ephemerid.n,
            installDate: moment(
              globalConfigMeta.demographics.install_date,
              'YYYY-MM-DD',
            ),
            // never sent to backend
            session: this.config.session,
          });
        }
      }

      await this.signalQueue.push(
        {
          type: schema.name,
          behavior: signal,

          // Information for the `meta` part of a signal can come from different
          // places: global config, override when calling `handleTelemetrySignal`
          // as well as local information about `version` and `date`. The
          // priority is as follows: config < override.
          meta: {
            date,
            version: schema.sendToBackend.version,
            dev:
              meta.dev !== undefined ? meta.dev : Boolean(globalConfigMeta.dev),
            beta:
              meta.beta !== undefined
                ? meta.beta
                : Boolean(globalConfigMeta.beta),
            demographics:
              globalConfigMeta.demographics === undefined
                ? {}
                : getDemographics(schema, globalConfigMeta.demographics),
            ephemerid,
          },
        },
        { force },
      );
    }
  }
}
