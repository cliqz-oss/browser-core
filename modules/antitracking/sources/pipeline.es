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
  constructor() {
    this.debug = false;
    this.stages = ['open', 'modify', 'response'];

    this.pipelines = {
      open: [],
      modify: [],
      response: [],
    };

    this.stepFns = {};
  }

  /**
   * Add a function to the specified stages
   * @param {Array.<String>}   stages
   * @param {Function} fn     function to add
   * @param {String}   name   (optional) infered from function if undefined
   */
  add(_stages, fn, name) {
    const resolvedName = name || this._getNameFromFunction(fn);
    const stages = Array.isArray(_stages) ? _stages : [_stages];
    // relax function duplication contraint here
    const resFn = this.stepFns[resolvedName] || fn;
    return this.addPipelineStep({ name: resolvedName, stages, fn: resFn });
  }

  /**
   * Bulk add functions to stages
   * @param {Array.<String>} stages
   * @param {Array.<Function>} fns
   */
  addAll(stages, fns) {
    fns.forEach((fn) => {
      this.add(stages, fn);
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
  addPipelineStep({ name, stages, fn, after, before }) {
    // check if step already exists
    if (this.stepFns[name] && this.stepFns[name] !== fn) {
      throw new Error(`trying to overwrite existing stepFn ${name}`);
    }
    this.stepFns[name] = fn;
    const afterArr = after || [];
    const beforeArr = before || [];

    stages.forEach((stage) => {
      const emptyPipeline = this.pipelines[stage].length === 0;
      const hasAfter = afterArr.length > 0;
      const hasBefore = beforeArr.length > 0;

      if ((!hasAfter && !hasBefore) || emptyPipeline) {
        // just put it at the end
        this.pipelines[stage].push(name);
      } else if (hasAfter && !hasBefore) {
        // find where the dependencies are in the pipeline
        const afterIndices = afterArr.map(s => this.pipelines[stage].indexOf(s));
        const insertMin = Math.max(...afterIndices);
        if (afterIndices.indexOf(-1) >= 0) {
          throw new Error(`missing steps from 'after' list, after=${afterArr}, pipeline=${this.pipelines[stage]}`);
        }

        this.pipelines[stage].splice(insertMin + 1, 0, name);
      } else if (hasBefore && !hasAfter) {
        const beforeIndices = beforeArr.map(s => this.pipelines[stage].indexOf(s));
        const insertMax = Math.min(...beforeIndices);
        if (insertMax < 0) {
          throw new Error(`missing steps from 'before' list, before=${beforeArr}, pipeline=${this.pipelines[stage]}`);
        }

        this.pipelines[stage].splice(insertMax, 0, name);
      } else {
        throw new Error('cannot take both before and after constraints');
      }
    });
  }

  /**
   * Removes the given step name from all pipelines
   * @param  {String} name of the step
   */
  removePipelineStep(name) {
    // remove from stages
    this.stages.map(s => this.pipelines[s]).forEach((pipeline) => {
      const index = pipeline.indexOf(name);
      if (index !== -1) {
        pipeline.splice(index, 1);
      }
    });
    // remove from function map
    delete this.stepFns[name];
  }

  /**
   * Runs the pipeline for the name stage, using the specified initial state
   * @param  {String} stage        Name of the stage to run
   * @param  {Object} initialState State passed to the pipeline
   * @return {Object}              Output from the pipeline
   */
  execute(stage, initialState) {
    return this._executePipeline(this.pipelines[stage], initialState, `ATTRACK.${stage.toUpperCase()}`);
  }

  _executePipeline(pipeline, initialState, logKey) {
    const state = initialState;
    const response = {
      redirectTo(url) {
        this.redirectUrl = url;
      },
      block() {
        this.cancel = true;
      },
      modifyHeader(name, value) {
        if (!this.requestHeaders) {
          this.requestHeaders = [];
        }
        this.requestHeaders.push({ name, value });
      }
    };
    let i = 0;
    for (; i < pipeline.length; i += 1) {
      try {
        const cont = this.stepFns[pipeline[i]](state, response);
        if (!cont) {
          break;
        }
      } catch (e) {
        console.error(logKey, state.url, 'Step exception', e);
        break;
      }
    }
    if (this.debug) {
      console.log(logKey, state.url, 'Break at', (pipeline[i] || 'end'));
    }
    return response;
  }

  _getNameFromFunction(fn) {
    return fn.name.startsWith('bound ') ? fn.name.substring(6) : fn.name;
  }

}
