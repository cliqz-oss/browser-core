/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global sinon */
/* global describeModule */

const expect = chai.expect;

export default describeModule('core/services/pacemaker',
  () => ({
    'core/kord/inject': {
      default: {
        service: () => {
        },
      },
    },
    'core/logger': {
      default: {
        get: () => ({
          debug() {},
          log() {},
          error() {},
        }),
      },
    },
  }),
  () => {
    describe('#pacemaker', () => {
      let service;
      let pacemaker;
      let clock;

      beforeEach(function () {
        clock = sinon.useFakeTimers();
        service = this.module().service;
        pacemaker = service();
      });

      afterEach(function () {
        service.unload();
        clock.restore();
      });

      it('no timer when no task registered', () => {
        expect(pacemaker.freq).to.be.null;
        expect(pacemaker.timer).to.be.null;
        expect(pacemaker.tasks.size).to.equal(0);
      });

      it('adds one task', async () => {
        const spy = sinon.spy();
        pacemaker.register(spy, { timeout: 10 });

        // Check state of pacemaker
        expect(pacemaker.freq).to.equal(10);
        expect(pacemaker.timer).not.to.be.null;
        expect(pacemaker.tasks.size).to.equal(1);
        expect(spy).not.to.have.been.called;

        // Check state of task
        const task = pacemaker.tasks.values().next().value;
        expect(task.args).to.have.length(0);
        expect(task.name).to.equal('<anon>');
        expect(task.timeout).to.equal(10);
        expect(task.once).to.be.false;

        // Make sure spy was not called after tick
        expect(spy).not.to.have.been.called;

        // Run all timers and expect task to have been called
        clock.next();
        expect(spy).to.have.been.called;

        // Run again and task should be called twice
        clock.next();
        expect(spy).to.have.been.calledTwice;
      });

      it('adds two tasks + a timeout', async () => {
        const tickSpy = sinon.spy(pacemaker, '_tick');
        const adjustSpy = sinon.spy(pacemaker, '_adjustFrequency');

        const spy1 = sinon.spy();
        pacemaker.register(spy1, { timeout: 20 });
        expect(tickSpy).not.to.have.been.called;
        expect(adjustSpy).to.have.been.calledOnce;

        const spy2 = sinon.spy();
        pacemaker.register(spy2, { timeout: 10 });
        expect(tickSpy).not.to.have.been.called;
        expect(adjustSpy).to.have.been.calledTwice;

        const spy3 = sinon.spy();
        const timeout = pacemaker.setTimeout(spy3, 30);
        expect(tickSpy).not.to.have.been.called;
        expect(adjustSpy).to.have.been.calledThrice;

        // None of the tasks was triggered at this point
        expect(spy1).not.to.have.been.called;
        expect(spy2).not.to.have.been.called;
        expect(spy3).not.to.have.been.called;

        // Tick should call task2 but none of the others
        clock.next();
        expect(spy1).not.to.have.been.called; // tick=10 -> not triggered
        expect(spy2).to.have.been.calledOnce; // tick=10 -> triggered
        expect(spy3).not.to.have.been.called; // tick=10 -> not triggered

        // Tick should call task1 + task2 but not task3 (yet)
        clock.next();
        expect(spy1).to.have.been.calledOnce; // tick=20 -> triggered
        expect(spy2).to.have.been.calledTwice; // tick=20 -> triggered
        expect(spy3).not.to.have.been.called; // tick=20 -> not triggered

        // Tick should call task1 + task2 + task3
        clock.next();
        expect(spy1).to.have.been.calledOnce; // tick=30 -> not triggered
        expect(spy2).to.have.been.calledThrice; // tick=30 -> triggered
        expect(spy3).to.have.been.calledOnce; // tick=30 -> triggered

        // At this point the setTimeout should have been removed
        expect(pacemaker.tasks).not.to.include(timeout);
        expect(pacemaker.tasks.size).to.equal(2);
      });

      it('stops when no task', async () => {
        // Initialize pacemaker with one setTimeout
        const spy = sinon.spy();
        pacemaker.setTimeout(spy, 30);
        expect(pacemaker.tasks.size).to.equal(1);

        // Call timeout
        clock.next();
        expect(spy).to.have.been.calledOnce;

        // Make sure pacemaker stopped
        expect(pacemaker.timer).to.be.null;
        expect(pacemaker.freq).to.be.null;
        expect(pacemaker.tasks.size).to.equal(0);
      });

      it('adjusts frequency', async () => {
        const tickSpy = sinon.spy(pacemaker, '_tick');
        const adjustSpy = sinon.spy(pacemaker, '_adjustFrequency');

        // Initial state, no freq and no timer
        expect(pacemaker.freq).to.be.null;
        expect(pacemaker.timer).to.be.null;

        // Add one task with timeout 0
        pacemaker.setTimeout(() => {}, 0);
        expect(pacemaker.freq).to.equal(0);
        expect(pacemaker.timer).not.to.be.null;
        expect(adjustSpy).to.have.been.calledOnce;
        expect(tickSpy).not.to.have.been.called;

        // Trigger task
        clock.next();
        expect(tickSpy).to.have.been.calledOnce;

        // Expect pacemaker to have stopped
        expect(pacemaker.timer).to.be.null;
        expect(pacemaker.freq).to.be.null;
        expect(pacemaker.tasks.size).to.equal(0);

        // Make sure freq is adjusted properly
        const t1 = pacemaker.setTimeout(() => {}, 30);
        expect(pacemaker.freq).to.equal(30);

        const t2 = pacemaker.register(() => {}, { timeout: 29 });
        expect(pacemaker.freq).to.equal(29);

        const t3 = pacemaker.register(() => {}, { timeout: 31 });
        expect(pacemaker.freq).to.equal(29);

        const t4 = pacemaker.register(() => {}, { timeout: 32 });
        expect(pacemaker.freq).to.equal(29);

        t4.stop();
        expect(pacemaker.freq).to.equal(29);

        t2.stop();
        expect(pacemaker.freq).to.equal(30);

        t1.stop();
        expect(pacemaker.freq).to.equal(31);

        t3.stop();
        expect(pacemaker.freq).to.be.null;
        expect(pacemaker.timer).to.be.null;
      });

      it('adds instant task', async () => {
        clock.tick(1);
        const spy = sinon.spy();
        pacemaker.register(spy, { timeout: 5, startImmediately: true });

        // Trigger first on next tick (start immediately)
        clock.next();
        expect(spy).to.have.been.calledOnce;
        expect(pacemaker.tasks.values().next().value.last).to.equal(1);

        // Trigger next after `timeout` milliseconds
        clock.next();
        expect(spy).to.have.been.calledTwice;
        expect(pacemaker.tasks.values().next().value.last).to.equal(6);
      });

      it('throwing task does not stop pacemaker', () => {
        const spy = sinon.spy(() => { throw new Error('boom'); });
        const task = pacemaker.register(spy, { timeout: 1 });

        expect(spy).not.to.have.been.called;

        clock.next();
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.thrown;

        clock.next();
        expect(spy).to.have.been.calledTwice;
        expect(spy).to.have.thrown;

        clock.next();
        expect(spy).to.have.been.calledThrice;
        expect(spy).to.have.thrown;

        task.stop();
      });
    });
  });
