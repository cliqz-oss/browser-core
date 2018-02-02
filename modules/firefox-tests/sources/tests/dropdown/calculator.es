/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import {
  $cliqzResults,
  expect,
  fillIn,
  getLocaliseString,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';

export default function () {
  function getResultString() {
    return typeof $cliqzResults().find('#calc-answer')[0] !== 'undefined' ? $cliqzResults().find('#calc-answer')[0].textContent.trim() : '= -1';
  }

  function calculatorTest(query, result) {
    context(query, function () {
      beforeEach(function () {
        respondWith({ results: [] });
        withHistory([]);
        fillIn(query);
        return waitForPopup();
      });

      it('renders correct answer', function () {
        expect(getResultString()).to.contain(`= ${getLocaliseString({ de: result[0], default: result[1] })}`);
      });
    });
  }

  describe('calculator', function () {
    context('results tests', function () {
      const pairs = {
        '1 + 1': ['2', '2'],
        '1.1 + 1': ['2,1', '2.1'],
        '1,1 + 1': ['2,1', '2.1'],
        '1,1 + 1.1': ['2,2', '2.2'],
        '1000 + 1': ['1 001', '1 001'],
        '1,000 + 1': ['2', '1 001'],
        '1.000 + 1': ['1 001', '2'],
        '1,111 + 1': ['2,111', '1 112'],
        '1.111 + 1': ['1 112', '2.111'],
        '1.001 + 1,001': ['1 002,001', '1 002.001'],
        '1.111,1 + 1': ['1 112,1', '-1'],
        '1,111.1 + 1': ['-1', '1 112.1'],
        '1.111.111 + 1': ['1 111 112', '1 111 112'],
        '1,111,111 + 1': ['1 111 112', '1 111 112'],
        '1,111.111 + 1': ['-1', '1 112.111'],
        '1.111,111 + 1': ['1 112,111', '-1'],
        '1,111,11 + 1': ['-1', '-1'],
        '1.111.11 + 1': ['-1', '-1'],
        '1,11,111 + 1': ['-1', '-1'],
        '1.11.111 + 1': ['-1', '-1'],
        '1,111 + 1,1': ['2,211', '1 112.1'],
        '1.111 + 1.1': ['1 112,1', '2.211'],
        '0.001 + 1': ['1,001', '1.001'],
        '0,001 + 1': ['1,001', '1.001'],
        '0,001 * 0,001': ['0,000001', '0.000001'],
        '0.001 * 0.001': ['0,000001', '0.000001'],
        '0,001 * 0.001': ['0,000001', '0.000001'],
        '0.001 * 0,001': ['0,000001', '0.000001'],
        '0.111111 * 1': ['0,111111', '0.111111'],
        '0,111111 * 1': ['0,111111', '0.111111'],
        '0.1111111 * 1': ['0,111111', '0.111111'],
        '0,1111111 * 1': ['0,111111', '0.111111'],
      };

      Object.keys(pairs).forEach(function (key) {
        calculatorTest(key, pairs[key]);
      });
    });

    describe('ui tests', function () {
      beforeEach(function () {
        respondWith({ results: [] });
        fillIn('2222 * 2');
        return waitForPopup();
      });

      it('renders correct answer', function () {
        expect(getResultString()).to.contain(`= ${getLocaliseString({ de: '4 444', default: '4 444' })}`);
      });

      it('should have copy text', function () {
        expect(getResultString()).to.contain(getLocaliseString({ de: 'Klicken zum Kopieren', default: 'Click to copy' }));
      });
    });
  });
}
