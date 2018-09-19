import { isWebExtension } from '../../../core/platform';
import {
  app,
  expect,
  win,
} from '../../../tests/core/test-helpers';

export default function () {
  if (isWebExtension) {
    return;
  }

  const activeIconUrl = 'resource://cliqz/control-center/images/cc-active.svg';
  const inactiveIconUrl = 'resource://cliqz/control-center/images/cc-critical.svg';

  context('control center icon', function () {
    context('when active', function () {
      before(function () {
        app.modules['control-center'].getWindowModule(win).setState('active');
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

    context('when inactive', function () {
      before(function () {
        app.modules['control-center'].getWindowModule(win).setState('inactive');
      });

      after(function () {
        app.modules['control-center'].getWindowModule(win).setState('active');
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

