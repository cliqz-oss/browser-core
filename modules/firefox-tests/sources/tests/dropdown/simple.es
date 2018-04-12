import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import { results, friendlyUrl } from './fixtures/resultsSimple';

export default function () {
  context('for single generic result', function () {
    let $resultElement;

    before(function () {
      blurUrlBar();
      respondWith({ results });
      withHistory([]);
      fillIn('test');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults().find(`a.result[data-url='${results[0].url}']`)[0];
      });
    });

    it('renders title', function () {
      const titleSelector = ".abstract span[data-extra='title']";
      expect($resultElement).to.contain(titleSelector);
      expect($resultElement.querySelector(titleSelector)).to.have.text(results[0].snippet.title);
    });

    it('renders description', function () {
      const descriptionSelector = ".abstract span[class='description']";
      expect($resultElement).to.contain(descriptionSelector);
      expect($resultElement.querySelector(descriptionSelector))
        .to.have.text(results[0].snippet.description);
    });

    it('renders url', function () {
      const urlSelector = ".abstract span[class='url']";
      expect($resultElement).to.contain(urlSelector);
      expect($resultElement.querySelector(urlSelector)).to.have.text(friendlyUrl[results[0].url]);
    });

    it('renders logo', function () {
      const logoSelector = ".icons span[class='logo']";
      expect($resultElement).to.contain(logoSelector);
    });
  });
}
