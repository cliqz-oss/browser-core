import {
  prefs,
  getResourceUrl,
  newTab,
  queryHTML,
  expect,
  waitForAsync
} from '../../../tests/core/test-helpers';
import { PREF_SEARCH_MODE } from '../../../freshtab/constants';
import { isWebExtension } from '../../../core/platform';

const url = getResourceUrl('freshtab', 'home.html');

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('freshtab', function () {
    describe('urlbar', function () {
      before(function () {
        prefs.set(PREF_SEARCH_MODE, 'search');
      });

      context('in search mode', function () {
        it('renders 0 height iframe for results', async function () {
          newTab(url, false);

          const iframeStyle = await waitForAsync(async () => {
            const styles = await queryHTML(url, '#cliqz-dropdown', 'style', {
              attributeType: 'attribute',
            });
            return styles[0];
          });

          expect(iframeStyle).to.equal('height: 0px;');
        });
      });
    });
  });
}
