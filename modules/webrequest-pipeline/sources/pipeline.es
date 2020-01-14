/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import telemetry from '../core/services/telemetry';
import pacemaker from '../core/services/pacemaker';

import logger from './logger';
import LatencyMetrics from './latency-metrics';


/**
 * Handles a set of function pipelines. These pipelines start with an initial state
 * and empty object return-value, then flow these arguments through the functions in
 * the pipeline until one returns false.
 *
 * @class Pipeline
 * @namespace antitracking
 */
export default class Pipeline {
  /**
   * Pipeline constructor. Creates an empty pipeline with the default
   * stages (open, modify and response).
   */
  constructor(name, steps = [], isBreakable = true) {
    this.name = name;
    this.isBreakable = isBreakable;

    // Collect timings for steps of the pipeline
    this.measureLatency = telemetry.isEnabled();
    if (this.measureLatency) {
      this.latencyMetrics = new LatencyMetrics(name);
      this.latencyMetrics.init();
    }

    // Init empty pipeline
    this.unload({ shallow: true });

    this.addAll(steps);
  }

  get length() {
    return this.pipeline.length;
  }

  unload({ shallow = false } = {}) {
    this.pipeline = [];
    this.stepNames = new Set();

    if (this.measureLatency && !shallow) {
      this.latencyMetrics.unload();
    }
  }

  /**
   * Bulk add functions to stages
   * @param {Array.<Function>} fns
   */
  addAll(steps) {
    for (let i = 0; i < steps.length; i += 1) {
      this.addPipelineStep(steps[i]);
    }
  }

  /**
   * Adds a step to the pipeline with the given constraints.
   *
   * By default the step is placed at the end of the pipeline. If after or
   * before are specified, the step is placed at the first available position
   * which satisfies these constraints.
   *
   * @param {String} step.name The name of the function. Must be unique.
   * @param {String} step.spec The kind of step: collect, break, blocking, annotate.
   * @param {Function} options.fn The step function
   * @param {Array.<String>} options.after Array of step names for which this step should be
   * put afterwards
   * @param {Array.<String>} options.before Array of step names for which this step should be
   * put before
   */
  addPipelineStep(step) {
    const { name, fn, after = [], before = [], spec } = step;

    if (name === undefined) {
      throw new Error(`Every step of the pipeline should be given a name in ${this.name}`);
    }

    if (this.stepNames.has(name)) {
      throw new Error(`Trying to overwrite existing ${this.name}.${name}`);
    }

    if (spec !== 'annotate' && spec !== 'collect' && spec !== 'blocking' && spec !== 'break') {
      throw new Error(`Every step of the pipeline should be given a valid spec (got ${spec}): ${this.name}.${name}`);
    }

    if (fn === undefined) {
      throw new Error(`Every step of the pipeline should have a function ('fn' argument): ${this.name}.${name}`);
    }

    if (spec === 'break' && !this.isBreakable) {
      throw new Error(`Cannot add a break step '${name}' to an unbreakable pipeline`);
    }

    this.stepNames.add(name);

    const emptyPipeline = this.pipeline.length === 0;
    const hasAfter = after.length > 0;
    const hasBefore = before.length > 0;

    if ((!hasAfter && !hasBefore) || emptyPipeline) {
      // just put it at the end
      this.pipeline.push(step);
    } else if (hasAfter && !hasBefore) {
      // Find the first index which is after any of the step names in `after`
      let insertAt = -1;
      for (let i = 0; i < this.pipeline.length; i += 1) {
        if (after.indexOf(this.pipeline[i].name) !== -1) {
          insertAt = i + 1;
        }
      }

      if (insertAt === -1) {
        throw new Error(`no step from 'after' list found, after=${JSON.stringify(after)}, pipeline=${this.name}`);
      } else if (insertAt === this.pipeline.length) {
        this.pipeline.push(step);
      } else {
        this.pipeline.splice(insertAt, 0, step);
      }
    } else if (hasBefore && !hasAfter) {
      // Find the last index which is before any of the step names in `before`
      let insertAt = -1;
      for (let i = 0; i < this.pipeline.length; i += 1) {
        if (before.indexOf(this.pipeline[i].name) !== -1) {
          insertAt = i;
          break;
        }
      }

      if (insertAt === -1) {
        this.pipeline.push(step);
      } else {
        this.pipeline.splice(insertAt, 0, step);
      }
    } else {
      throw new Error('cannot take both before and after constraints');
    }
  }

  /**
   * Removes the given step name from the pipeline
   * @param  {String} name of the step
   */
  removePipelineStep(name) {
    this.pipeline = this.pipeline.filter(step => step.name !== name);
    this.stepNames.delete(name);
  }

  /**
   * Run pipeline on the given `webRequestContext`. The `response` argument can
   * be altered by steps and will be used to generate the blocking response for
   * the webrequest listener.
   */
  execute(webRequestContext, response, canAlterRequest = true) {
    const measureLatency = this.measureLatency === true && webRequestContext.isPrivate === false;
    for (let i = 0; i < this.pipeline.length; i += 1) {
      // Measure time elapsed while running this step
      const t0 = measureLatency === true ? performance.now() : 0;
      const { name, fn, spec } = this.pipeline[i];
      let cont = true;

      // Execute step
      switch (spec) {
        case 'break':
          // A `break` step is usually used to disrupt the pipeline
          // life-cycle. It does not have access to the response (cannot
          // block/redirect/change headers) and shall not mutate the
          // webRequestContext.
          cont = fn(webRequestContext);
          break;
        case 'annotate':
          // An `annotate` step is used to mutate/annotate the
          // webRequestContext. For example it might be used to keep track of
          // some information on the page-load (statistics about number of
          // cookies blocked, etc.). It does not have access to the response
          // (cannot block/redirect/change headers).
          cont = fn(webRequestContext);
          break;
        case 'collect':
          // A `collect` step is used to only observe the http life-cycle and
          // is never used to alter it in any way. It does not have access to
          // the response either. Because of these constraints, we can safely
          // run these steps asynchronously to not block the processing of
          // requests.
          pacemaker.nextIdle(fn, webRequestContext);
          break;
        case 'blocking':
          // A `blocking` step is used to alter the life-cycle of a request:
          // blocking, redirecting, modifying headers. It can also mutate the
          // webRequestContext, although it would be better to use an
          // `annotate` step for this purpose.
          //
          // When `canAlterRequest` is `false`, blocking steps are ignored.
          // This can be the case if a domain has been white-listed at the
          // webrequest-pipeline level.
          if (canAlterRequest === true) {
            cont = fn(webRequestContext, response);
          }
          break;
        default:
          logger.error('Invalid spec for step', this.pipeline[i]);
          break;
      }

      // Register this step's execution time
      if (measureLatency === true) {
        this.latencyMetrics.addTiming(name, performance.now() - t0);
      }

      // Handle early termination of the pipeline. If a step returns `false` and
      // this pipeline is allowed to be 'broken', then we ignore the remaining
      // steps.
      if (cont === false) {
        if (this.isBreakable === true) {
          logger.debug(this.name, webRequestContext.url, 'Break at', name);
          break;
        }
        // we only reach here if the pipeline is not breakable: show a warning
        // that we ignored the break
        logger.error(this.name, webRequestContext.url, 'ignoring attempted break of unbreakable pipeline at', name);
      }
    }
  }

  safeExecute(context, response, canAlterRequest) {
    try {
      this.execute(
        context,
        response,
        canAlterRequest,
      );
    } catch (ex) {
      logger.error('while running pipeline', context, ex);
    }
  }
}
