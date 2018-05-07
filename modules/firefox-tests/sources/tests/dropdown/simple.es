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
  const mainResultSelector = '.cliqz-result:not(.history)';

  context('for single generic result', function () {
    before(function () {
      window.preventRestarts = true;
      blurUrlBar();
      respondWith({ results });
      withHistory([]);
      fillIn('test');
      return waitForPopup(2);
    });

    after(function () {
      window.preventRestarts = false;
    });

    it('renders title', function () {
      const titleSelector = '.abstract .title';
      expect($cliqzResults.querySelector(`${mainResultSelector} ${titleSelector}`)).to.exist;
      expect($cliqzResults.querySelector(`${mainResultSelector} ${titleSelector}`)).to.have.text(results[0].snippet.title);
    });

    it('renders description', function () {
      const descriptionSelector = '.abstract .description';
      expect($cliqzResults.querySelector(`${mainResultSelector} ${descriptionSelector}`)).to.exist;
      expect($cliqzResults.querySelector(`${mainResultSelector} ${descriptionSelector}`))
        .to.have.text(results[0].snippet.description);
    });

    it('renders url', function () {
      const urlSelector = '.abstract .url';
      expect($cliqzResults.querySelector(`${mainResultSelector} ${urlSelector}`)).to.exist;
      expect($cliqzResults.querySelector(`${mainResultSelector} ${urlSelector}`)).to.have.text(friendlyUrl[results[0].url]);
    });

    it('renders logo', function () {
      const logoSelector = '.icons .logo';
      expect($cliqzResults.querySelector(`${mainResultSelector} ${logoSelector}`)).to.exist;
    });
  });
}
