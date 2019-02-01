import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import { results, friendlyUrl } from '../../core/integration/fixtures/resultsSimple';

export default function () {
  const mainResultSelector = '.cliqz-result:not(.history)';

  context('for single generic result', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('test');
      await waitForPopup(1);
    });

    after(function () {
      win.preventRestarts = false;
    });

    it('renders title', async function () {
      const titleSelector = '.abstract .title';
      expect(await $cliqzResults.querySelector(`${mainResultSelector} ${titleSelector}`)).to.exist;
      expect(await $cliqzResults.querySelector(`${mainResultSelector} ${titleSelector}`)).to.have.text(results[0].snippet.title);
    });

    it('renders description', async function () {
      const descriptionSelector = '.abstract .description';
      expect(await $cliqzResults.querySelector(`${mainResultSelector} ${descriptionSelector}`)).to.exist;
      expect(await $cliqzResults.querySelector(`${mainResultSelector} ${descriptionSelector}`))
        .to.have.text(results[0].snippet.description);
    });

    it('renders url', async function () {
      const urlSelector = '.abstract .url';
      expect(await $cliqzResults.querySelector(`${mainResultSelector} ${urlSelector}`)).to.exist;
      expect(await $cliqzResults.querySelector(`${mainResultSelector} ${urlSelector}`)).to.have.text(friendlyUrl[results[0].url]);
    });

    it('renders logo', async function () {
      const logoSelector = '.icons .logo';
      expect(await $cliqzResults.querySelector(`${mainResultSelector} ${logoSelector}`)).to.exist;
    });
  });
}
