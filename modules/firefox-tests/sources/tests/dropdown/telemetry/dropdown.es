import {
  blurUrlBar,
  CliqzUtils,
  expect,
  fillIn,
  press,
  respondWith,
  waitForPopup,
  waitForPopupClosed,
  withHistory } from '../helpers';
import { results } from '../fixtures/resultsTwoSimple';

export default function () {
  describe('generates correct telemetry signals for dropdown', function () {
    const win = CliqzUtils.getWindow();
    let resultSignals;
    let resultSignalCount;

    beforeEach(function () {
      blurUrlBar();
      // clear telemetry
      win.allTelemetry = [];
      withHistory([]);
      respondWith({ results });
    });

    context('after being displayed', function () {
      beforeEach(function () {
        fillIn('www.royalgames.com');
        return waitForPopup()
          .then(function () {
            resultSignals = win.allTelemetry.filter(function (s) {
              return ((s.type === 'activity') && (s.action === 'dropdown_open'));
            });
            resultSignalCount = resultSignals.length;
          });
      });

      describe('send an "activity > dropdown_open" signal', function () {
        it('only once and with correct amount of fields', function () {
          expect(resultSignalCount).to.equal(1);
          resultSignals.forEach(function (signal) {
            expect(Object.keys(signal).length).to.equal(3);
          });
        });

        it('with an existing "width" field containing correct value', function () {
          resultSignals.forEach(function (signal) {
            expect(resultSignalCount).to.be.above(0);
            expect(signal.width).to.exist;
            expect(typeof signal.width).to.equal('number');
          });
        });
      });
    });

    context('after being closed', function () {
      beforeEach(function () {
        fillIn('www.royalgames.com');
        return waitForPopup()
          .then(function () {
            press({ key: 'Escape' });
            return waitForPopupClosed();
          })
          .then(function () {
            resultSignals = win.allTelemetry.filter(function (s) {
              return ((s.type === 'activity') && (s.action === 'dropdown_close'));
            });
            resultSignalCount = resultSignals.length;
          });
      });

      describe('send an "activity > dropdown_close" signal', function () {
        it('only once and with correct amount of fields', function () {
          expect(resultSignalCount).to.equal(1);
          resultSignals.forEach(function (signal) {
            expect(Object.keys(signal).length).to.equal(2);
          });
        });
      });
    });
  });
}
