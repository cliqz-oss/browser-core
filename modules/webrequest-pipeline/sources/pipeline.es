import console from '../core/console';

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
  constructor(name, steps) {
    this.debug = false;
    this.logKey = name;

    // Init empty pipeline
    this.unload();

    // If given, add steps to the pipeline
    if (steps) {
      this.addAll(steps);
    }
  }

  unload() {
    this.pipeline = [];
    this.stepFns = {};
  }

  /**
   * Add a function to the pipeline
   * @param {Function} fn     function to add
   * @param {String}   name   (optional) infered from function if undefined
   */
  add(fn, name) {
    if (!name) {
      throw new Error('Every step of the pipeline should be given a name');
    }

    // relax function duplication contraint here
    const resFn = this.stepFns[name] || fn;

    return this.addPipelineStep({ name, fn: resFn });
  }

  /**
   * Bulk add functions to stages
   * @param {Array.<Function>} fns
   */
  addAll(fns) {
    fns.forEach(([fn, name]) => {
      this.add(fn, name);
    });
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
  addPipelineStep({ name, fn, after, before }) {
    // check if step already exists
    if (this.stepFns[name] && this.stepFns[name] !== fn) {
      throw new Error(`trying to overwrite existing stepFn ${name} in ${this.logKey}`);
    }

    this.stepFns[name] = fn;
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
    delete this.stepFns[name];
  }

  /**
   * Runs the pipeline for the name stage, using the specified initial state
   * @param  {Object} initialState State passed to the pipeline
   */
  execute(state, response) {
    let i = 0;
    for (; i < this.pipeline.length; i += 1) {
      try {
        const cont = this.stepFns[this.pipeline[i]](state, response);
        if (!cont) {
          if (this.debug) {
            console.log(this.logKey, state.url, 'Break at', (this.pipeline[i] || 'end'));
          }
          break;
          // TODO - do we want to allow a step/pipeline to disrupt other
          // steps/pipeline (potentially from other modules)?
          // return cont;
        }
      } catch (e) {
        console.error(this.logKey, state.url, 'Step exception', e, e.stack);
        break;
      }
    }

    return true;
  }
}
