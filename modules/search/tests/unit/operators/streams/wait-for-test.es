/* global chai, describeModule */

const Rx = require('rxjs');
const operators = require('rxjs/operators');
const rxSandbox = require('rx-sandbox').rxSandbox;


const mock = {
  rxjs: Rx,
  'rxjs/operators': operators,
};

export default describeModule('search/operators/streams/wait-for',
  () => mock,
  () => {
    describe('#waitFor', function () {
      let waitFor;
      let sandbox;

      beforeEach(function () {
        sandbox = rxSandbox.create();
        waitFor = this.module().default;
      });

      it('does not emit without signal', function () {
        const source$ = sandbox.hot('-1-2-');
        const signal$ = sandbox.hot('-----');
        const expected = sandbox.e(' -----');

        const messages = sandbox.getMessages(source$.pipe(waitFor(signal$)));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('does not emit signals', function () {
        const source$ = sandbox.hot('--');
        const signal$ = sandbox.hot('-x');
        const expected = sandbox.e(' --');

        const messages = sandbox.getMessages(source$.pipe(waitFor(signal$)));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('waits for signal and emits latest source value', function () {
        const source$ = sandbox.hot('-12-3-');
        const signal$ = sandbox.hot('---x--');
        const expected = sandbox.e(' ---23');

        const messages = sandbox.getMessages(source$.pipe(waitFor(signal$)));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('emits all source values after first signal', function () {
        const source$ = sandbox.hot('--1-2');
        const signal$ = sandbox.hot('-x---');
        const expected = sandbox.e(' --1-2');

        const messages = sandbox.getMessages(source$.pipe(waitFor(signal$)));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('does not re-emit on subsequent signals', function () {
        const source$ = sandbox.hot('--1--');
        const signal$ = sandbox.hot('-x--x');
        const expected = sandbox.e(' --1--');

        const messages = sandbox.getMessages(source$.pipe(waitFor(signal$)));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });
    });
  });
