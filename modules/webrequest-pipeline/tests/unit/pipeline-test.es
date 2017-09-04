/* globals describeModule, chai */

export default describeModule('webrequest-pipeline/pipeline',
  function () {
    return {
      'core/console': {
        default: console,
      }
    };
  },
  function () {
    let Pipeline;

    beforeEach(function () {
      Pipeline = this.module().default;
    });

    describe('constructor', () => {
      it('creates an empty pipeline', () => {
        const p = new Pipeline();
        chai.expect(p.pipeline).to.have.length(0);
      });
    });

    describe('#addPipelineStep', () => {
      let p;

      beforeEach(function () {
        p = new Pipeline();
      });

      it('adds a step to the pipeline', () => {
        p.addPipelineStep({ name: 'test', fn: () => true });
        chai.expect(p.pipeline).to.have.length(1);
        chai.expect(p.pipeline).to.contain('test');
      });

      it('adds to stage to the end of the pipeline', () => {
        p.addPipelineStep({ name: 'part1', fn: () => true });
        p.addPipelineStep({ name: 'part2', fn: () => true });

        chai.expect(p.pipeline).to.contain('part1');
        chai.expect(p.pipeline).to.contain('part2');
        chai.expect(p.pipeline.indexOf('part2')).to.equal(1);
      });

      it('throws an Error if function with the same name as already been added', () => {
        p.addPipelineStep({ name: 'part1', fn: () => true });
        chai.expect(p.addPipelineStep.bind(p, { name: 'part1', fn: () => false })).to.throw(Error);
      });

      it('allows step to be added with the same name if the functions match', () => {
        const fn = () => true;
        p.addPipelineStep({ name: 'part1', fn });
        p.addPipelineStep({ name: 'part1', fn });

        chai.expect(p.pipeline).to.contain('part1');
      });

      context('before option', () => {
        it('inserts the step before the named steps', () => {
          p.addPipelineStep({ name: 'part1', fn: () => true });
          p.addPipelineStep({ name: 'part3', fn: () => true });
          p.addPipelineStep({ name: 'part2', fn: () => true, before: ['part3'] });

          chai.expect(p.pipeline).to.eql(['part1', 'part2', 'part3']);
        });

        it('throws an Error if before dependencies do not exist', () => {
          p.addPipelineStep({ name: 'part1', fn: () => true });
          chai.expect(p.addPipelineStep.bind(p, { name: 'part2', fn: () => true, before: ['part3'] })).to.throw(Error);
        });
      });

      context('after option', () => {
        it('inserts the step after the named steps', () => {
          p.addPipelineStep({ name: 'part1', fn: () => true });
          p.addPipelineStep({ name: 'part3', fn: () => true });
          p.addPipelineStep({ name: 'part2', fn: () => true, after: ['part1'] });

          chai.expect(p.pipeline).to.eql(['part1', 'part2', 'part3']);
        });

        it('throws an Error if before dependencies do not exist', () => {
          p.addPipelineStep({ name: 'part1', fn: () => true });
          chai.expect(p.addPipelineStep.bind(p, { name: 'part2', fn: () => true, after: ['part3'] })).to.throw(Error);
        });
      });

      context('before and after options', () => {
        it('throws an Error if both are specified', () => {
          p.addPipelineStep({ name: 'part1', fn: () => true });
          p.addPipelineStep({ name: 'part3', fn: () => true });

          chai.expect(p.addPipelineStep.bind(p, { name: 'part2', fn: () => true, after: ['part1'], before: ['part3'] })).to.throw(Error);
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
        p = new Pipeline();
      });

      it('returns object for empty pipeline', () => {
        const response = p.execute();
        chai.expect(response).to.not.be.null;
        expectEmptyResponse(response);
      });

      it('calls functions in pipeline one with mutible state argument', () => {
        let fn1Called = 0;
        let fn2Called = 0;

        function fn1(state) {
          state.fn1 = true;
          fn1Called += 1;
          return true;
        }

        function fn2(state) {
          chai.expect(state.fn1).to.be.true;
          fn2Called += 1;
          return true;
        }
        p.add(fn1, 'fn1');
        p.add(fn2, 'fn2');

        const resp = p.execute({});
        chai.expect(fn1Called).to.eql(1);
        chai.expect(fn2Called).to.eql(1);
        expectEmptyResponse(resp);
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
        p.add(fn1, 'fn1');
        p.add(fn2, 'fn2');

        const resp = p.execute({});
        chai.expect(fn1Called).to.eql(1);
        chai.expect(fn2Called).to.eql(0);
        expectEmptyResponse(resp);
      });

      it('returns the final value of the result', () => {
        const resp = {};

        function fn1(state, res) {
          res.fn1 = 4;
          return true;
        }

        function fn2(state, res) {
          res.fn1 += 1;
          res.fn2 = -4;
          return true;
        }
        p.add(fn1, 'fn1');
        p.add(fn2, 'fn2');

        p.execute({}, resp);
        chai.expect(resp.fn1).to.eql(5);
        chai.expect(resp.fn2).to.eql(-4);
      });

      it('stops when a function throws', () => {
        let fn1Called = 0;
        let fn2Called = 0;
        const resp = {};

        function fn1(state, res) {
          fn1Called += 1;
          res.beforeError = 1;
          throw new Error();
          res.afterError = 2;
        }

        function fn2(state) {
          fn2Called += 1;
          return true;
        }
        p.add(fn1, 'fn1');
        p.add(fn2, 'fn2');

        p.execute({}, resp);
        chai.expect(fn1Called).to.eql(1);
        chai.expect(fn2Called).to.eql(0);
        chai.expect(resp.beforeError).to.eql(1);
      });
    });
  }
);
