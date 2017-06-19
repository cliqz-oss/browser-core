export default describeModule("core/anacron",
  function () {
    return {
      'core/cliqz': { utils: { } },
    }
  },
  function () {
    var anacron;
    var Task;
    beforeEach(function() {
      this.deps('core/cliqz').utils.setPref = () => null;
      this.deps('core/cliqz').utils.getPref = (_, _default) => _default;

      const Anacron = this.module().default;
      anacron = new Anacron({ get: () => {} , set: () => {} });
      Task = this.module().Task;
    });
    describe("Queue", function () {
      var Queue;
      beforeEach(function () {
        Queue = this.module().Queue;
      });
      describe("#isEmpty", function () {
        it("should return true", function () {
          let queue = new Queue();
          chai.expect(queue.isEmpty()).to.be.true;
        });
      });
    });
    describe("Cron", function () {
      var cron;
      beforeEach(function () {
        const Cron = this.module().Cron;
        cron = new Cron();
      });
      describe("#start", function () {
        it("should set isRunning to true", function () {
          this.deps('core/cliqz').utils.setInterval = () => null;
          chai.expect(cron.isRunning).to.be.false;
          cron.start();
          chai.expect(cron.isRunning).to.be.true;
        });
        it("should start running tasks", function () {
          var intervalDelay;
          var timeoutDelay;
          var wasRun = false;
          this.deps('core/cliqz').utils.setInterval = (_callback, _delay) =>  {
            intervalDelay = _delay;
            _callback();
          };
          this.deps('core/cliqz').utils.setTimeout = (_callback, _delay, _date) => {
            timeoutDelay = _delay;
            _callback(_date);
          };
          cron.schedule(() => wasRun = true, '* *', 'test');
          cron.start();
          chai.expect(intervalDelay).to.equal(60000);
          chai.expect(timeoutDelay).to.equal(0);
          chai.expect(wasRun).to.be.true;
        });
      });
      describe("#stop", function () {
        it("should set isRunning to false", function () {
          this.deps('core/cliqz').utils.setInterval = () => null;
          this.deps('core/cliqz').utils.clearInterval = () => null;
          cron.start();
          cron.stop();
          chai.expect(cron.isRunning).to.be.false;
        });
        it("should call clearInterval", function () {
          var wasCalled;
          this.deps('core/cliqz').utils.setInterval = () => null;
          this.deps('core/cliqz').utils.clearInterval = () => wasCalled = true;
          cron.start();
          cron.stop();
          chai.expect(wasCalled).to.be.true;
        });
      });
      describe("#run", function () {
        it("should run tasks with date as parameter", function () {
          this.deps('core/cliqz').utils.setTimeout = (_callback, _delay, _date) => _callback(_date);
          var date;
          cron.schedule((_date) => date = _date, '* *');
          cron.run(new Date('01.01.2016 00:01'));
          chai.expect(date).to.eql(new Date('01.01.2016 00:01'));
        });
        it("should run tasks if they are scheduled", function () {
          this.deps('core/cliqz').utils.setTimeout = (func) => func();
          let wasRunA = false;
          let wasRunB = false;
          cron.schedule(() => wasRunA = true, '* *');
          cron.schedule(() => wasRunB = true, '0 0');
          cron.run(new Date('01.01.2016 00:01'));
          chai.expect(wasRunA).to.be.true;
          chai.expect(wasRunB).to.be.false;
        });
      });
      describe("#shouldRun", function () {
        context("absolute times", function () {
          it("should return true", function () {
            let task;

            task = new Task(() => null, '* *');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 00:00')))).to.be.true;
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 12:30')))).to.be.true;

            task = new Task(() => null, '0 0');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 00:00')))).to.be.true;

            task = new Task(() => null, '30 12');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 12:30')))).to.be.true;
          });
          it("should return false", function () {
            let task;

            task = new Task(() => null, '0 0');
            // throw task._pattern;
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 01:00')))).to.be.false;
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 00:01')))).to.be.false;

            task = new Task(() => null, '12 30');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 12:31')))).to.be.false;
          });
        });
        context("minute intervals", function () {
          it("should return true", function () {
            let task;

            task = new Task(() => null, '*/5 *');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 00:00')))).to.be.true;
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 00:20')))).to.be.true;
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 12:30')))).to.be.true;
          });
          it("should return false", function () {
            let task;

            task = new Task(() => null, '*/5 *');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 00:01')))).to.be.false;
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 20:06')))).to.be.false;
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 12:59')))).to.be.false;

            task = new Task(() => null, '*/5 12');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 11:30')))).to.be.false;
          });
        });
        context("hour intervals", function () {
          it("should return true", function () {
            let task;

            task = new Task(() => null, '* */2');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 00:00')))).to.be.true;
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 00:01')))).to.be.true;

            task = new Task(() => null, '10 */2');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 20:10')))).to.be.true;

            task = new Task(() => null, '*/20 */5');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 10:40')))).to.be.true;
          });
          it("should return false", function () {
            let task;

            task = new Task(() => null, '* */2');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 01:00')))).to.be.false;
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 01:01')))).to.be.false;

            task = new Task(() => null, '10 */2');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 09:20')))).to.be.false;

            task = new Task(() => null, '*/20 */5');
            chai.expect(task.shouldRun(new Date(Date.parse('01.01.2016 10:41')))).to.be.false;
          });
        });
      });
    });
    describe("#converge", function () {
      var queue;
      beforeEach(function () {
        queue = [];
        // TODO: don't touch internals; rather inject queue in the first place
        anacron.queue = { enqueue: (item) => queue.push(item) };
      });
      it("should schedule none", function () {
        anacron.last = (new Date('2016-01-01 00:01:00')).getTime();
        anacron.converge(new Date('2016-01-01 00:01:59'));
        chai.expect(queue.length).to.equal(0);
      });
      it("should schedule 1", function () {
        anacron.last = (new Date('2016-01-01 00:01:00')).getTime();
        anacron.converge(new Date('2016-01-01 00:02:00'));
        chai.expect(queue.length).to.equal(1);
      });
      it("should schedule 5", function () {
        anacron.last = (new Date('2016-01-01 00:01:00')).getTime();
        anacron.converge(new Date('2016-01-01 00:06:00'));
        chai.expect(queue.length).to.equal(5);
      });
      it("should schedule 5", function () {
        anacron.last = (new Date('2016-01-01 23:59:05')).getTime();
        anacron.converge(new Date('2016-01-02 00:00:05'));
        chai.expect(queue.length).to.equal(1);
      });
      it("should schedule 1440", function () {
        anacron.last = (new Date('2016-01-01 00:00:00')).getTime();
        anacron.converge(new Date('2016-01-02 00:00:00'));
        chai.expect(queue.length).to.equal(1440);
      });
      it("should schedule 1 if `last` is not set ", function () {
        anacron.last = undefined;
        anacron.converge(new Date('2016-01-02 00:00:00'));
        chai.expect(queue.length).to.equal(1);
        chai.expect(queue[0]).to.eql(new Date('2016-01-02 00:00:00'));
      });
      it("should schedule 1 if `last` is set to a future date ", function () {
        anacron.last = (new Date('2016-01-01 01:01:00')).getTime();
        anacron.converge(new Date('2016-01-01 01:00:00'));
        chai.expect(queue.length).to.equal(1);
      });
    });
  }
)
