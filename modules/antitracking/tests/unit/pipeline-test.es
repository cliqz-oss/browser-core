
export default describeModule('antitracking/pipeline',
  function () {
    return {
      'core/console': {
        default: console,
      }
    };
  },
  function () {
    let Pipeline;

    beforeEach(function() {
      Pipeline = this.module().default;
    });

    describe('constructor', () => {

      it('creates an empty pipeline', () => {
        const p = new Pipeline();
        chai.expect(p.pipelines.open).to.have.length(0);
        chai.expect(p.pipelines.modify).to.have.length(0);
        chai.expect(p.pipelines.response).to.have.length(0);
      });

    });

    describe('#addPipelineStep', () => {
      let p;

      beforeEach(function() {
        p = new Pipeline();
      });

      it('adds a step to the pipeline', () => {
        p.addPipelineStep({name: 'test', stages: ['open'], fn: () => true});
        chai.expect(p.pipelines.open).to.have.length(1);
        chai.expect(p.pipelines.open).to.contain('test');

        chai.expect(p.pipelines.modify).to.have.length(0);
        chai.expect(p.pipelines.response).to.have.length(0);
      });

      it('can add to multiple stages', () => {
        const stages = ['open', 'response'];
        p.addPipelineStep({name: 'test', stages, fn: () => true});

        stages.forEach((s) => {
          chai.expect(p.pipelines[s]).to.have.length(1);
          chai.expect(p.pipelines[s]).to.contain('test');
        });
        chai.expect(p.pipelines.modify).to.have.length(0);
      });

      it('adds to stage to the end of the pipeline', () => {
        const stage = 'modify';

        p.addPipelineStep({name: 'part1', stages: [stage], fn: () => true});
        p.addPipelineStep({name: 'part2', stages: [stage], fn: () => true});

        chai.expect(p.pipelines[stage]).to.contain('part1');
        chai.expect(p.pipelines[stage]).to.contain('part2');
        chai.expect(p.pipelines[stage].indexOf('part2')).to.equal(1);
      });

      it('throws an Error if function with the same name as already been added', () => {
        const stage = 'modify';

        p.addPipelineStep({name: 'part1', stages: [stage], fn: () => true});
        chai.expect(p.addPipelineStep.bind(p, {name: 'part1', stages: [stage], fn: () => false})).to.throw(Error);
      });

      it('allows step to be added with the same name if the functions match', () => {
        const fn = () => true;
        p.addPipelineStep({name: 'part1', stages: ['open'], fn});
        p.addPipelineStep({name: 'part1', stages: ['modify'], fn});

        chai.expect(p.pipelines.open).to.contain('part1');
        chai.expect(p.pipelines.modify).to.contain('part1');
      });

      context('before option', () => {

        it('inserts the step before the named steps', () => {
          const stage = 'modify';

          p.addPipelineStep({name: 'part1', stages: [stage], fn: () => true});
          p.addPipelineStep({name: 'part3', stages: [stage], fn: () => true});
          p.addPipelineStep({name: 'part2', stages: [stage], fn: () => true, before: ['part3']});

          chai.expect(p.pipelines[stage]).to.eql(['part1', 'part2', 'part3']);
        });

        it('throws an Error if before dependencies do not exist', () => {
          const stage = 'modify';

          p.addPipelineStep({name: 'part1', stages: [stage], fn: () => true});
          chai.expect(p.addPipelineStep.bind(p, {name: 'part2', stages: [stage], fn: () => true, before: ['part3']})).to.throw(Error);
        });

      });

      context('after option', () => {

        it('inserts the step after the named steps', () => {
          const stages = ['open', 'modify'];

          p.addPipelineStep({name: 'part1', stages, fn: () => true});
          p.addPipelineStep({name: 'part3', stages, fn: () => true});
          p.addPipelineStep({name: 'part2', stages, fn: () => true, after: ['part1']});

          stages.forEach((s) => {
            chai.expect(p.pipelines[s]).to.eql(['part1', 'part2', 'part3']);
          });
        });

        it('throws an Error if before dependencies do not exist', () => {
          const stage = 'modify';

          p.addPipelineStep({name: 'part1', stages: [stage], fn: () => true});
          chai.expect(p.addPipelineStep.bind(p, {name: 'part2', stages: [stage], fn: () => true, after: ['part3']})).to.throw(Error);
        });

      });

      context('before and after options', () => {

        it('throws an Error if both are specified', () => {
          const stage = 'modify';

          p.addPipelineStep({name: 'part1', stages: [stage], fn: () => true});
          p.addPipelineStep({name: 'part3', stages: [stage], fn: () => true});

          chai.expect(p.addPipelineStep.bind(p, {name: 'part2', stages: [stage], fn: () => true, after: ['part1'], before: ['part3']})).to.throw(Error);
        });
      });
    });

    describe('#execute', () => {
      let p;

      const expectedKeys = new Set(['redirectTo', 'block', 'modifyHeader']);

      function expectEmptyResponse(resp) {
        const keys = Object.keys(resp).filter((k) => !expectedKeys.has(k));
        chai.expect(keys).to.eql([]);
      }

      beforeEach(function() {
        p = new Pipeline();
      });

      it('returns object for empty pipeline', () => {
        const response = p.execute('open');
        chai.expect(response).to.not.be.null;
        expectEmptyResponse(response);
      });

      it('calls functions in pipeline one with mutible state argument', () => {
        const stage = 'open';
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
        p.add(stage, fn1);
        p.add(stage, fn2);

        const resp = p.execute(stage, {});
        chai.expect(fn1Called).to.eql(1);
        chai.expect(fn2Called).to.eql(1);
        expectEmptyResponse(resp);
      });

      it('stops when a function returns false', () => {
        const stage = 'open';
        let fn1Called = 0;
        let fn2Called = 0;

        function fn1(state) {
          fn1Called += 1;
          return false;
        }

        function fn2(state) {
          fn2Called += 1;
          return true;
        }
        p.add(stage, fn1);
        p.add(stage, fn2);

        const resp = p.execute(stage, {});
        chai.expect(fn1Called).to.eql(1);
        chai.expect(fn2Called).to.eql(0);
        expectEmptyResponse(resp);
      });

      it('returns the final value of the result', () => {
        const stage = 'open';

        function fn1(state, res) {
          res.fn1 = 4;
          return true;
        }

        function fn2(state, res) {
          res.fn1 += 1;
          res.fn2 = -4;
          return true;
        }
        p.add(stage, fn1);
        p.add(stage, fn2);

        const resp = p.execute(stage, {});
        chai.expect(resp.fn1).to.eql(5);
        chai.expect(resp.fn2).to.eql(-4);
      });

      it('stops when a function throws', () => {
        const stage = 'open';
        let fn1Called = 0;
        let fn2Called = 0;

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
        p.add(stage, fn1);
        p.add(stage, fn2);

        const resp = p.execute(stage, {});
        chai.expect(fn1Called).to.eql(1);
        chai.expect(fn2Called).to.eql(0);
        chai.expect(resp.beforeError).to.eql(1);
      });
    });
  }
);
