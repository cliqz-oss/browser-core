/* global chai */
/* global describeModule */

export default describeModule('core/helpers/serial-executor',
  () => ({
    'core/console': { default: console },
    'core/utils': {
      default: {
        setTimeout,
      }
    },
  }),
  () => {
    let SerialExecutor;

    beforeEach(function () {
      SerialExecutor = this.module().default;
    });

    describe('#enqueue', () => {
      it('runs the function once asynchonously', (done) => {
        const ex = new SerialExecutor();
        let ran = false;
        ex.enqueue(() => {
          chai.expect(ran).to.be.false;
          ran = true;
          done();
          return Promise.resolve();
        });
        chai.expect(ran).to.be.false;
      });

      it('runs tasks serially and in submission order', (done) => {
        const ex = new SerialExecutor();
        let task1 = false;
        let task2 = false;
        ex.enqueue(() => {
          chai.expect(task1).to.be.false;
          chai.expect(task2).to.be.false;
          task1 = true;
          return Promise.resolve();
        });
        ex.enqueue(() => {
          chai.expect(task1).to.be.true;
          chai.expect(task2).to.be.false;
          task2 = true;
          done();
          return Promise.resolve();
        });
        chai.expect(task1).to.be.false;
        chai.expect(task2).to.be.false;
      });

      it('runs tasks after a promise rejection', (done) => {
        const ex = new SerialExecutor();
        ex.enqueue(() => Promise.reject());
        ex.enqueue(() => {
          done();
        });
      });

      it('runs tasks after a task exception', (done) => {
        const ex = new SerialExecutor();
        ex.enqueue(() => {
          throw new Error('fail');
        });
        ex.enqueue(() => {
          done();
        });
      });

      it('can run more than one batch', (done) => {
        const ex = new SerialExecutor();
        ex.enqueue(() => {
          setTimeout(() => ex.enqueue(done), 0);
        });
      });
    });
  });
