/* global it, expect, respondWith, fillIn, waitForPopup,
          $cliqzResults, withHistory */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-expressions: "off" */

export default function () {
  context('history', function () {
    let resultElement;
    const historyResults = [
      {
        style: 'favicon',
        value: 'http://cliqz.com',
        image: '',
        comment: 'xxxx',
        label: '',
      }
    ];

    // TODO: remove this test, it is just an example
    before(function () {
      respondWith({ results: [] });
      withHistory(historyResults);
      fillIn('cliqz');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults().find(`a.result[href='${historyResults[0].value}']`)[0];
      });
    });

    it('render', function () {
      const titleSelector = ".abstract span[data-extra='title']";
      expect(resultElement).to.contain(titleSelector);
      expect(resultElement.querySelector(titleSelector)).to.have.text(historyResults[0].comment);
    });
  });
}
