/* global it, expect, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-expressions: "off" */

export default function () {
  context('adult question', function () {
    const results = [
      {
        url: 'http://www.xvideos.com/',
        snippet: {
          extra: {
            adult: true,
            alternatives: [],
            language: {}
          },
          title: 'Free Porn Videos - XVIDEOS.COM'
        },
        c_url: 'http://www.xvideos.com/',
        type: 'bm'
      }
    ];
    let resultElement;

    beforeEach(function () {
      respondWith({ results });
      fillIn('xvideos');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    it('renders question', function () {
      const questionSelector = '.result.adult-question';
      expect(resultElement).to.contain(questionSelector);
      const question = resultElement.querySelector('.result.adult-question > .padded');
      expect(question.textContent.trim()).to.be.equal('Websites with explicit content have been blocked automatically. Continue blocking?');
    });

    it('renders buttons', function () {
      const buttonsArea = resultElement.querySelector('.buttons');
      expect(buttonsArea).to.exist;
      const buttons = buttonsArea.querySelectorAll('.result');
      expect(buttons[0].textContent.trim()).to.be.equal('Show once');
      expect(buttons[1].textContent.trim()).to.be.equal('Always');
      expect(buttons[2].textContent.trim()).to.be.equal('Never');
    });
  });
}
