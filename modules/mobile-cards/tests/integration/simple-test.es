import {
  expect,
  newTab,
  queryHTML,
  waitForElement,
  win,
} from '../../../tests/core/test-helpers';

import {
  mockSearch,
} from './helpers';

import {
  getResourceUrl,
} from '../../../tests/core/integration/helpers';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe.skip('mobile cards simple', function () {
    let url;
    before(async function () {
      url = getResourceUrl('mobile-cards/cards.html');
      const id = await newTab(url);
      await mockSearch({ results:
        [
          {
            url: 'http://www.royalgames.com/',
            snippet: {
              title: 'Spielen - Kostenlose Spiele Spielen',
              description: 'Kostenlose Spiele spielen, Kartenspiele, Puzzlespiele, Wortspiele, Actionspiele, Brettspiele, Sportspiele, Denkspiele, Strategiespiele und Flashspiele bei Royalgames.com.',
            },
          }
        ]
      });
      win.CLIQZ.app.modules.search.action('startSearch', 'test', { tab: { id } });
      await waitForElement({
        url,
        selector: '[aria-label="generic-title"]',
        isPresent: true
      });
    });

    it('renders title', async function () {
      const $titles = await queryHTML(url, '[aria-label="generic-title"]', 'innerText');
      expect($titles[0]).to.equal('Spielen - Kostenlose Spiele Spielen');
    });
  });
}
