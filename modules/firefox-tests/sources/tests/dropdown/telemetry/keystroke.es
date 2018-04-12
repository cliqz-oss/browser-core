import {
  blurUrlBar,
  CliqzUtils,
  expect,
  fillIn,
  press,
  release,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from '../helpers';
import { results } from '../fixtures/resultsTwoSimple';

export default function () {
  context('generates correct telemetry', function () {
    const validKeystrokeSignalFields = [
      { name: 'current_length', type: 'number' },
      { name: 'invalid', type: 'boolean', expValue: false },
    ];
    const invalidKeystrokeSignalFields = [
      { name: 'current_length', type: 'number' },
      { name: 'invalid', type: 'boolean', expValue: true },
    ];
    const keysToCheck = [
      { keystroke: { key: 'a', code: 'KeyA' }, signal: true },
      { keystroke: { key: 'd', code: 'KeyD' }, signal: true },
      { keystroke: { key: '1', code: 'Digit1' }, signal: true },
      { keystroke: { key: '`', code: 'Backquote' }, signal: true },
      { keystroke: { key: ';', code: 'Semicolon' }, signal: true },
      { keystroke: { key: 'R', code: 'KeyR', shiftKey: true }, signal: true },
      { keystroke: { key: 'Backspace' }, signal: true },
      { keystroke: { key: 'F1' }, signal: false },
      { keystroke: { key: 'Shift', code: 'ShiftLeft' }, signal: false },
      { keystroke: { key: 'Escape' }, signal: false },
      { keystroke: { key: 'Delete' }, signal: false },
      { keystroke: { key: 'CapsLock' }, signal: false },
      { keystroke: { key: 'ArrowUp' }, signal: false },
      { keystroke: { key: 'End' }, signal: false },
      { keystroke: { key: 'Control', code: 'ControlLeft', shiftKey: true }, signal: false },
    ];
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    let resultSignals;
    let resultSignalCount;

    beforeEach(function () {
      blurUrlBar();
      withHistory([]);
      respondWith({ results });
    });

    afterEach(function () {
      release({ key: 'Control', code: 'ControlLeft' });
      release({ key: 'Shift', code: 'ShiftLeft' });
    });

    [...keysToCheck].forEach(function (key) {
      describe(`after pressing "${key.keystroke.key}" key`, function () {
        beforeEach(function () {
          fillIn('abc');
          return waitForPopup()
            .then(function () {
              // clear telemetry
              win.allTelemetry = [];
              press(key.keystroke);
              return new Promise(function (resolve) {
                CliqzUtils.setTimeout(resolve, 300);
              });
            })
            .then(function () {
              resultSignals = win.allTelemetry.filter(function (s) {
                return ((s.type === 'activity') && (s.action === 'key_stroke'));
              });
              resultSignalCount = resultSignals.length;
            });
        });

        if (key.signal) {
          describe('sends an "activity > key_stroke" signal', function () {
            it('only once and with correct amount of fields', function () {
              expect(resultSignalCount).to.equal(1);
              resultSignals.forEach(function (signal) {
                expect(Object.keys(signal).length).to.equal(validKeystrokeSignalFields.length + 2);
              });
            });

            validKeystrokeSignalFields.forEach(function (field) {
              it(`with an existing "${field.name}" field containing correct value(s)`, function () {
                resultSignals.forEach(function (signal) {
                  expect(resultSignalCount).to.be.above(0);
                  expect(signal[field.name]).to.exist;
                  expect(typeof signal[field.name]).to.equal(field.type);

                  if (field.expValue !== undefined) {
                    expect(signal[field.name]).to.equal(field.expValue);
                  }
                });
              });
            });
          });
        } else {
          it('does not send an "activity > key_stroke" signal', function () {
            expect(resultSignalCount).to.equal(0);
          });
        }
      });
    });

    [
      { name: '1 char', fill: 'a' },
      { name: '0 chars', fill: '' }
    ].forEach(function (bckspace) {
      describe(`after pressing backspace with ${bckspace.name} at the end of the urlbar`, function () {
        beforeEach(function () {
          fillIn(bckspace.fill);
          return waitFor(function () {
            return ((urlBar.selectionStart === urlBar.selectionEnd));
          })
            .then(function () {
              win.allTelemetry = [];
              press({ key: 'Backspace' });
              return new Promise(function (resolve) {
                setTimeout(resolve, 300);
              });
            })
            .then(function () {
              resultSignals = win.allTelemetry.filter(function (s) {
                return ((s.type === 'activity') && (s.action === 'key_stroke'));
              });
              resultSignalCount = resultSignals.length;
            });
        });

        it('does not send an "activity > key_stroke" signal', function () {
          expect(resultSignalCount).to.equal(0);
        });
      });
    });

    [
      { name: '2 chars', fill: 'ab', signal: true },
      { name: '1 char', fill: 'a', signal: false },
      { name: '0 chars', fill: '', signal: false }
    ].forEach(function (del) {
      describe(`after pressing delete with ${del.name} at the beginning of the urlbar`, function () {
        beforeEach(function () {
          fillIn(del.fill);
          // move the cursor to the beginning
          urlBar.selectionStart = 0;
          urlBar.selectionEnd = 0;
          return waitFor(function () {
            return ((urlBar.selectionStart === 0) && (urlBar.selectionEnd === 0));
          })
            .then(function () {
              win.allTelemetry = [];
              press({ key: 'Delete' });
              return new Promise(function (resolve) {
                setTimeout(resolve, 300);
              });
            })
            .then(function () {
              resultSignals = win.allTelemetry.filter(function (s) {
                return ((s.type === 'activity') && (s.action === 'key_stroke'));
              });
              resultSignalCount = resultSignals.length;
            });
        });

        if (del.signal) {
          describe('sends an "activity > key_stroke" signal', function () {
            it('only once and with correct amount of fields', function () {
              expect(resultSignalCount).to.equal(1);
              resultSignals.forEach(function (signal) {
                expect(Object.keys(signal).length).to.equal(validKeystrokeSignalFields.length + 2);
              });
            });

            validKeystrokeSignalFields.forEach(function (field) {
              it(`with an existing "${field.name}" field containing correct value(s)`, function () {
                resultSignals.forEach(function (signal) {
                  expect(resultSignalCount).to.be.above(0);
                  expect(signal[field.name]).to.exist;
                  expect(typeof signal[field.name]).to.equal(field.type);

                  if (field.expValue !== undefined) {
                    expect(signal[field.name]).to.equal(field.expValue);
                  }
                });
              });
            });
          });
        } else {
          it('does not send an "activity > key_stroke" signal', function () {
            expect(resultSignalCount).to.equal(0);
          });
        }
      });
    });

    ['Delete', 'Backspace'].forEach(function (key) {
      describe(`after selecting whole query and pressing ${key}`, function () {
        beforeEach(function () {
          fillIn('abc');
          // move the selection start to the beginning
          urlBar.selectionStart = 0;
          return waitFor(function () {
            return ((urlBar.selectionStart === 0) && (urlBar.selectionEnd !== 0));
          })
            .then(function () {
              win.allTelemetry = [];
              press({ key });
              return new Promise(function (resolve) {
                setTimeout(resolve, 300);
              });
            })
            .then(function () {
              resultSignals = win.allTelemetry.filter(function (s) {
                return ((s.type === 'activity') && (s.action === 'key_stroke'));
              });
              resultSignalCount = resultSignals.length;
            });
        });

        it('does not send an "activity > key_stroke" signal', function () {
          expect(resultSignalCount).to.equal(0);
        });
      });
    });

    describe('after pressing a key 2 times', function () {
      beforeEach(function () {
        // clear telemetry
        win.allTelemetry = [];
        urlBar.focus();
        press({ key: 'a', code: 'KeyA' });
        return waitForPopup()
          .then(function () {
            press({ key: 'a', code: 'KeyA' });
            return new Promise(function (resolve) {
              return setTimeout(resolve, 300);
            });
          })
          .then(function () {
            resultSignals = win.allTelemetry.filter(function (s) {
              return ((s.type === 'activity') && (s.action === 'key_stroke'));
            });
            resultSignalCount = resultSignals.length;
          });
      });

      describe('sends an "activity > key_stroke" signal', function () {
        it('2 times and with correct amount of fields', function () {
          expect(resultSignalCount).to.equal(2);
          resultSignals.forEach(function (signal) {
            expect(Object.keys(signal).length).to.equal(validKeystrokeSignalFields.length + 2);
          });
        });
      });
    });

    context('when one of the results is an invalid URL', function () {
      beforeEach(function () {
        fillIn('view-source:chrome://random.url');
        // clear telemetry
        win.allTelemetry = [];
        press({ key: 'a', code: 'KeyA' });
        return new Promise(function (resolve) {
          return setTimeout(resolve, 300);
        })
          .then(function () {
            resultSignals = win.allTelemetry.filter(function (s) {
              return ((s.type === 'activity') && (s.action === 'key_stroke'));
            });
            resultSignalCount = resultSignals.length;
          });
      });

      describe('sends an "activity > key_stroke" signal', function () {
        it('only once and with correct amount of fields', function () {
          expect(resultSignalCount).to.equal(1);
          resultSignals.forEach(function (signal) {
            expect(Object.keys(signal).length).to.equal(validKeystrokeSignalFields.length + 2);
          });
        });

        invalidKeystrokeSignalFields.forEach(function (field) {
          it(`with an existing "${field.name}" field containing correct value(s)`, function () {
            resultSignals.forEach(function (signal) {
              expect(resultSignalCount).to.be.above(0);
              expect(signal[field.name]).to.exist;
              expect(typeof signal[field.name]).to.equal(field.type);

              if (field.expValue !== undefined) {
                expect(signal[field.name]).to.equal(field.expValue);
              }
            });
          });
        });
      });
    });
  });
}
