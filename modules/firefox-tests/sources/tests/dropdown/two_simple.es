import {
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import { results, friendlyUrl } from './fixtures/resultsTwoSimple';

export default function () {
  context('for two generic results', function () {
    let $resultElement1;
    let $resultElement2;

    before(function () {
      respondWith({ results });
      withHistory([]);
      fillIn('ro');
      return waitForPopup().then(function () {
        $resultElement1 = $cliqzResults().find(`a.result[data-url='${results[0].url}']`)[0];
        $resultElement2 = $cliqzResults().find(`a.result[data-url='${results[1].url}']`)[0];
      });
    });

    it('renders first title', function () {
      const titleSelector = ".abstract span[data-extra='title']";
      expect($resultElement1).to.contain(titleSelector);
      expect($resultElement1.querySelector(titleSelector)).to.have.text(results[0].snippet.title);
    });

    it('renders first description', function () {
      const descriptionSelector = ".abstract span[class='description']";
      expect($resultElement1).to.contain(descriptionSelector);
      expect($resultElement1.querySelector(descriptionSelector))
        .to.have.text(results[0].snippet.description);
    });

    it('renders first url', function () {
      const urlSelector = ".abstract span[class='url']";
      expect($resultElement1).to.contain(urlSelector);
      expect($resultElement1.querySelector(urlSelector)).to.have.text(friendlyUrl[results[0].url]);
    });

    it('renders first logo', function () {
      const logoSelector = ".icons span[class='logo']";
      expect($resultElement1).to.contain(logoSelector);
    });

    it('renders second title', function () {
      const titleSelector = ".abstract span[data-extra='title']";
      expect($resultElement2).to.contain(titleSelector);
      expect($resultElement2.querySelector(titleSelector)).to.have.text(results[1].snippet.title);
    });

    it('renders second description', function () {
      const descriptionSelector = ".abstract span[class='description']";
      expect($resultElement2).to.contain(descriptionSelector);
      expect($resultElement2.querySelector(descriptionSelector))
        .to.have.text(results[1].snippet.description);
    });

    it('renders second url', function () {
      const urlSelector = ".abstract span[class='url']";
      expect($resultElement2).to.contain(urlSelector);
      expect($resultElement2.querySelector(urlSelector)).to.have.text(friendlyUrl[results[1].url]);
    });

    it('renders second logo', function () {
      const logoSelector = ".icons span[class='logo']";
      expect($resultElement2).to.contain(logoSelector);
    });
  });
}
