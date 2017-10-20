import { utils } from '../core/cliqz';
import logger from './logger';


/**
 * Handles a set of function pipelines. These pipelines start with an initial state
 * and empty object return-value, then flow these arguments through the functions in
 * the pipeline until one returns false.
 *
 * @class Pipeline
 * @namespace antitracking
 */
export default class {

  /**
   * Pipeline constructor. Creates an empty pipeline with the default
   * stages (open, modify and response).
   */
  constructor(name, steps = []) {
    this.name = name;

    // Optional timing collection
    this.collectTimings = false;
    this.timings = Object.create(null);
    logger.debug('timings', this.name, this.timings);

    // Init empty pipeline
    this.unload();

    this.addAll(steps);
  }

  get length() {
    return this.pipeline.length;
  }

  unload() {
    this.pipeline = [];
    this.stepFns = new Map();
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
      const beforeIndices = beforeArr.map(s => this.pipeline.indexOf(s));
      const insertMax = Math.min(...beforeIndices);
      if (insertMax < 0) {
        throw new Error(`missing steps from 'before' list, before=${beforeArr}, pipeline=${this.pipeline}`);
      }

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
      const name = this.pipeline[i];
      const { fn, spec } = this.stepFns.get(name);
      const t0 = Date.now();
      let cont;

      // Execute step
      try {
        switch (spec) {
          case 'break':
            cont = fn(webRequestContext);
            break;
          case 'annotate':
            cont = fn(webRequestContext);
            break;
          case 'collect':
            utils.setTimeout(
              () => fn(webRequestContext),
              0,
            );
            break;
          case 'blocking':
            if (canAlterRequest) {
              cont = fn(webRequestContext, response);
            }
            break;
          default:
            throw new Error(`Invalid spec for step ${name} in pipeline ${this.name}`);
        }
      } catch (e) {
        logger.error(this.name, webRequestContext.url, 'Step exception', e, e.stack);
        break;
      }

      // [Optional] Keep track of timings for pipeline steps
      if (this.collectTimings) {
        const total = Date.now() - t0;
        if (this.timings[name] === undefined) {
          this.timings[name] = Object.create(null);
        }

        this.timings[name][total] = (this.timings[name][total] || 0) + 1;
      }

      // Handle early termination of the pipeline
      if (cont === false) {
        logger.debug(this.name, webRequestContext.url, 'Break at', name);
        break;
        // TODO - do we want to allow a step/pipeline to disrupt other
        // steps/pipeline (potentially from other modules)?
        // return cont;
        //
        // We need to think about that as we might not want
        // Adblocker/Ghostery or other module doing blocking of requests to
        // prevent data collection (which should happen async)
      }
    }
  }
}
