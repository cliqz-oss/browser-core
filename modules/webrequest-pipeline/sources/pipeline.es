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
    this.latencyMetrics = new LatencyMetrics(name);
    this.latencyMetrics.init();

    // Init empty pipeline
    this.unload({ shallow: true });

    this.addAll(steps);
  }

  get length() {
    return this.pipeline.length;
  }

  unload({ shallow = false } = {}) {
    this.pipeline = [];
    this.stepFns = new Map();

    if (!shallow) {
      this.latencyMetrics.unload();
    }
  }

  /**
   * Add a function to the pipeline
   * @param {Function} fn     function to add
   * @param {String}   name   (optional) infered from function if undefined
   */
  add({ fn, name, spec }) {
    if (!name) {
      throw new Error(`Every step of the pipeline should be given a name in ${this.name}`);
    }

    if (!spec) {
      throw new Error(`Every step of the pipeline should be given a spec ${name} in ${this.name}`);
    }

    if (spec === 'break' && !this.isBreakable) {
      throw new Error(`Cannot add a break step '${name}' to an unbreakable pipline`);
    }

    return this.addPipelineStep({
      name,
      fn, // TODO: needed? this.stepFns.get(name) || fn, // Relax function duplication constraint
      spec: spec || 'all',
    });
  }

  /**
   * Bulk add functions to stages
   * @param {Array.<Function>} fns
   */
  addAll(steps) {
    for (let i = 0; i < steps.length; i += 1) {
      this.add(steps[i]);
    }
  }

  /**
   * Adds a step to the pipeline with the given constraints.
   *
   * By default the step is placed at the end of the pipeline. If after or before
   * are specified, the step is placed at the first available position which satisfies
   * these constraints.
   *
   * @param {String} options.name   the name of the function. Must be unique.
   * @param {Array.<String>}  options.stages The pipeline stages to which this function should
   * be added
   * @param {Function} options.fn     the step function
   * @param {Array.<String>} options.after  array of step names for which this step should be
   * put afterwards
   * @param {Array.<String>} options.before array of step names for which this step should be
   * put before
   */
  addPipelineStep({ name, fn, after, before, spec }) {
    // check if step already exists
    if (this.stepFns.has(name)) {
      throw new Error(`trying to overwrite existing stepFn ${name} in ${this.name}`);
    }

    this.stepFns.set(name, { fn, spec });
    const afterArr = after || [];
    const beforeArr = before || [];

    const emptyPipeline = this.pipeline.length === 0;
    const hasAfter = afterArr.length > 0;
    const hasBefore = beforeArr.length > 0;

    if ((!hasAfter && !hasBefore) || emptyPipeline) {
      // just put it at the end
      this.pipeline.push(name);
    } else if (hasAfter && !hasBefore) {
      // find where the dependencies are in the pipeline
      const afterIndices = afterArr.map(s => this.pipeline.indexOf(s));
      const insertMin = Math.max(...afterIndices);
      if (afterIndices.indexOf(-1) >= 0) {
        throw new Error(`missing steps from 'after' list, after=${afterArr}, pipeline=${this.pipeline}`);
      }

      this.pipeline.splice(insertMin + 1, 0, name);
    } else if (hasBefore && !hasAfter) {
      const beforeIndices = beforeArr.map(s => this.pipeline.indexOf(s)).filter(i => i !== -1);
      const insertMax = Math.min(...beforeIndices);
      this.pipeline.splice(insertMax, 0, name);
    } else {
      throw new Error('cannot take both before and after constraints');
    }
  }

  /**
   * Removes the given step name from the pipeline
   * @param  {String} name of the step
   */
  removePipelineStep(name) {
    const index = this.pipeline.indexOf(name);
    if (index !== -1) {
      this.pipeline.splice(index, 1);
    }

    // remove from function map
    this.stepFns.delete(name);
  }

  /**
   * Runs the pipeline for the name stage, using the specified initial state
   * @param  {Object} initialState State passed to the pipeline
   */
  execute(webRequestContext, response, canAlterRequest = true) {
    for (let i = 0; i < this.pipeline.length; i += 1) {
      // Measure time elapsed while running this step
      const t0 = Date.now();

      const name = this.pipeline[i];
      const { fn, spec } = this.stepFns.get(name);
      let cont;

      // Execute step
      try {
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
            setTimeout(
              () => fn(webRequestContext),
              0,
            );
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
            if (canAlterRequest) {
              cont = fn(webRequestContext, response);
            }
            break;
          default:
            logger.error('Invalid spec for step', { spec, name, pipeline: this.name });
            break;
        }
      } catch (e) {
        logger.error('Exception in pipeline', {
          pipeline: this.name,
          url: webRequestContext.url,
          step: name,
          spec,
        }, e);
        break;
      }

      // Register this step's execution time
      this.latencyMetrics.addTiming(name, Date.now() - t0);

      // Handle early termination of the pipeline. If a step returns `false` and
      // this pipeline is allowed to be 'broken', then we ignore the remaining
      // steps.
      if (cont === false) {
        if (this.isBreakable) {
          logger.debug(this.name, webRequestContext.url, 'Break at', name);
          break;
        }
        // we only reach here if the pipeline is not breakable: show a warning
        // that we ignored the break
        logger.debug(this.name, webRequestContext.url, 'ignoring attempted break of unbreakable pipeline at', name);
      }
    }
  }
}
