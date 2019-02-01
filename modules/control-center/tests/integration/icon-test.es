import { isWebExtension } from '../../../core/platform';
import {
  app,
  expect,
  win,
} from '../../../tests/core/integration/helpers';
import { getCurrentTabId } from '../../../core/tabs';


export default function () {
  if (isWebExtension) {
    return;
  }

  const activeIconUrl = 'resource://cliqz/control-center/images/cc-active.svg';
  const inactiveIconUrl = 'resource://cliqz/control-center/images/cc-critical.svg';

  xcontext('control center icon', function () {
    context('when active', function () {
      before(function () {
        const tabId = getCurrentTabId(win);
        app.modules['control-center'].background.actions.setState(tabId, 'active');
      });

      it('renders as dark', function () {
        expect(win.document.getElementById('control-center-browser-action')).to.exist;
        expect(win.document.getElementById('control-center-browser-action').style['list-style-image'])
          .to.contain(activeIconUrl);
        expect(win
          .getComputedStyle(win.document.getElementById('control-center-browser-action'))
          .getPropertyValue('--webextension-menupanel-image'))
          .to.contain(activeIconUrl);
        expect(win
          .getComputedStyle(win.document.getElementById('control-center-browser-action'))
          .getPropertyValue('--webextension-menupanel-image-2x'))
          .to.contain(activeIconUrl);
        expect(win
          .getComputedStyle(win.document.getElementById('control-center-browser-action'))
          .getPropertyValue('--webextension-toolbar-image'))
          .to.contain(activeIconUrl);
        expect(win
          .getComputedStyle(win.document.getElementById('control-center-browser-action'))
          .getPropertyValue('--webextension-toolbar-image-2x'))
          .to.contain(activeIconUrl);
      });
    });

    xcontext('when inactive', function () {
      before(function () {
        const tabId = getCurrentTabId(win);
        app.modules['control-center'].background.actions.setState(tabId, 'inactive');
      });

      after(function () {
        const tabId = getCurrentTabId(win);
        app.modules['control-center'].background.actions.setState(tabId, 'active');
      });

      it('renders as red', function () {
        expect(win.document.getElementById('control-center-browser-action')).to.exist;
        expect(win.document.getElementById('control-center-browser-action').style['list-style-image'])
          .to.contain(inactiveIconUrl);
        expect(win
          .getComputedStyle(win.document.getElementById('control-center-browser-action'))
          .getPropertyValue('--webextension-menupanel-image'))
          .to.contain(inactiveIconUrl);
        expect(win
          .getComputedStyle(win.document.getElementById('control-center-browser-action'))
          .getPropertyValue('--webextension-menupanel-image-2x'))
          .to.contain(inactiveIconUrl);
        expect(win
          .getComputedStyle(win.document.getElementById('control-center-browser-action'))
          .getPropertyValue('--webextension-toolbar-image'))
          .to.contain(inactiveIconUrl);
        expect(win
          .getComputedStyle(win.document.getElementById('control-center-browser-action'))
          .getPropertyValue('--webextension-toolbar-image-2x'))
          .to.contain(inactiveIconUrl);
      });
    });
  });
}
