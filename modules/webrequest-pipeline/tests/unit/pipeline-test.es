/* globals describeModule, chai */
/* eslint no-param-reassign: off */

export default describeModule('webrequest-pipeline/pipeline',
  () => ({
    'core/prefs': {
      default: {
        get(p, def) { return def; },
        set() {},
        has() { return true; },
      },
    },
    'core/utils': {
      default: {
        setTimeout(fn) { fn(); },
      },
    },
    'core/console': {
      default: {
        debug() {},
        log() {},
        error() {},
        warning() {},
      },
    },
    'core/services/telemetry': {
      default: {
        push: () => {},
        isEnabled: () => true,
      },
    },
    'core/helpers/timeout': {
      default: () => ({
        stop() {},
      }),
    },
  }),
  function () {
    let Pipeline;

    beforeEach(function () {
      Pipeline = this.module().default;
    });

    describe('constructor', () => {
      it('creates an empty pipeline', () => {
        const p = new Pipeline('name');
        chai.expect(p.pipeline).to.have.length(0);
      });
    });

    describe('#addPipelineStep', () => {
      let p;

      beforeEach(function () {
        p = new Pipeline('name');
      });

      it('adds a step to the pipeline', () => {
        p.addPipelineStep({ name: 'test', spec: 'blocking', fn: () => true });
        chai.expect(p.pipeline).to.have.length(1);
        chai.expect(p.pipeline).to.contain('test');
      });

      it('adds to stage to the end of the pipeline', () => {
        p.addPipelineStep({ name: 'part1', spec: 'blocking', fn: () => true });
        p.addPipelineStep({ name: 'part2', spec: 'blocking', fn: () => true });

        chai.expect(p.pipeline).to.contain('part1');
        chai.expect(p.pipeline).to.contain('part2');
        chai.expect(p.pipeline.indexOf('part2')).to.equal(1);
      });

      it('throws an Error if function with the same name as already been added', () => {
        p.addPipelineStep({ name: 'part1', spec: 'blocking', fn: () => true });
        chai.expect(p.addPipelineStep.bind(p, { name: 'part1', spec: 'blocking', fn: () => false })).to.throw(Error);
      });

      context('before option', () => {
        it('inserts the step before the named steps', () => {
          p.addPipelineStep({ name: 'part1', spec: 'blocking', fn: () => true });
          p.addPipelineStep({ name: 'part3', spec: 'blocking', fn: () => true });
          p.addPipelineStep({ name: 'part2', spec: 'blocking', fn: () => true, before: ['part3'] });

          chai.expect(p.pipeline).to.eql(['part1', 'part2', 'part3']);
        });

        it('does not an Error if before dependencies do not exist', () => {
          p.addPipelineStep({ name: 'part1', spec: 'blocking', fn: () => true });
          p.addPipelineStep({ name: 'part2', spec: 'blocking', fn: () => true, before: ['part3'] });
        });
      });

      context('after option', () => {
        it('inserts the step after the named steps', () => {
          p.addPipelineStep({ name: 'part1', spec: 'blocking', fn: () => true });
          p.addPipelineStep({ name: 'part3', spec: 'blocking', fn: () => true });
          p.addPipelineStep({ name: 'part2', spec: 'blocking', fn: () => true, after: ['part1'] });

          chai.expect(p.pipeline).to.eql(['part1', 'part2', 'part3']);
        });

        it('throws an Error if after dependencies do not exist', () => {
          p.addPipelineStep({ name: 'part1', spec: 'blocking', fn: () => true });
          chai.expect(p.addPipelineStep.bind(p, { name: 'part2', spec: 'blocking', fn: () => true, after: ['part3'] })).to.throw(Error);
        });
      });

      context('before and after options', () => {
        it('throws an Error if both are specified', () => {
          p.addPipelineStep({ name: 'part1', spec: 'blocking', fn: () => true });
          p.addPipelineStep({ name: 'part3', spec: 'blocking', fn: () => true });

          chai.expect(p.addPipelineStep.bind(p, { name: 'part2', spec: 'blocking', fn: () => true, after: ['part1'], before: ['part3'] })).to.throw(Error);
        });
      });
    });

    describe('#execute', () => {
      let p;

      const expectedKeys = new Set(['redirectTo', 'block', 'modifyHeader']);

      function expectEmptyResponse(resp) {
        const keys = Object.keys(resp).filter(k => !expectedKeys.has(k));
        chai.expect(keys).to.eql([]);
      }

      beforeEach(function () {
        p = new Pipeline('name');
      });

      it('returns object for empty pipeline', () => {
        const response = {};
        p.execute({}, response);
        chai.expect(response).to.not.be.null;
        expectEmptyResponse(response);
      });

      it('calls functions in pipeline one with mutible state argument', () => {
        let fn1Called = 0;
        let fn2Called = 0;

        function fn1(state) {
          state.fn1 = true;
          fn1Called += 1;
        }

        function fn2(state) {
          chai.expect(state.fn1).to.be.true;
          fn2Called += 1;
        }

        p.add({ fn: fn1, name: 'fn1', spec: 'blocking' });
        p.add({ fn: fn2, name: 'fn2', spec: 'blocking' });

        const response = {};
        p.execute({}, response);
        chai.expect(fn1Called).to.eql(1);
        chai.expect(fn2Called).to.eql(1);
        expectEmptyResponse(response);
      });

      it('stops when a function returns false', () => {
        let fn1Called = 0;
        let fn2Called = 0;

        function fn1() {
          fn1Called += 1;
          return false;
        }

        function fn2() {
          fn2Called += 1;
          return true;
        }
        p.add({ fn: fn1, name: 'fn1', spec: 'blocking' });
        p.add({ fn: fn2, name: 'fn2', spec: 'blocking' });

        const response = {};
        p.execute({}, response);
        chai.expect(fn1Called).to.eql(1);
        chai.expect(fn2Called).to.eql(0);
        expectEmptyResponse(response);
      });

      it('returns the final value of the result', () => {
        function fn1(state, res) {
          res.fn1 = 4;
          return true;
        }

        function fn2(state, res) {
          res.fn1 += 1;
          res.fn2 = -4;
          return true;
        }
        p.add({ fn: fn1, name: 'fn1', spec: 'blocking' });
        p.add({ fn: fn2, name: 'fn2', spec: 'blocking' });

        const response = {};
        p.execute({}, response);
        chai.expect(response.fn1).to.eql(5);
        chai.expect(response.fn2).to.eql(-4);
      });

      it('stops when a function throws', () => {
        let fn1Called = 0;
        let fn2Called = 0;

        function fn1(state, res) {
          fn1Called += 1;
          res.beforeError = 1;
          throw new Error();
          // res.afterError = 2;
        }

        function fn2() {
          fn2Called += 1;
          return true;
        }
        p.add({ fn: fn1, name: 'fn1', spec: 'blocking' });
        p.add({ fn: fn2, name: 'fn2', spec: 'blocking' });

        const response = {};
        p.execute({}, response);
        chai.expect(fn1Called).to.eql(1);
        chai.expect(fn2Called).to.eql(0);
        chai.expect(response.beforeError).to.eql(1);
      });
    });
  }
);
