import {
  app,
  expect,
  newTab,
} from '../../../tests/core/integration/helpers';

import { isFirefox } from '../../../core/platform';

export default function () {
  // This should be enabled in the future
  if (isFirefox) {
    return;
  }

  describe('registerContentScript', function () {
    const mod = app.modules['content-script-tests'].background;
    let onMessage;

    beforeEach(() => {
      onMessage = new Promise((resolve) => { mod.listener = resolve; });
    });

    context('module is enabled', () => {
      it('triggers content script on matching page', async () => {
        await newTab('http://example.com');
        const state = await onMessage;
        expect(state).to.eql({
          a: 42,
          test: true,
        });
      });

      it('does not run when page does not match', async () => {
        await newTab('http://locahost:3000');
        const timeout = new Promise(resolve => setTimeout(resolve, 500));
        const failOnMessage = new Promise((resolve, reject) => {
          onMessage.then(reject);
        });
        return Promise.race([timeout, failOnMessage]);
      });
    });

    context('module is disabled', () => {
      beforeEach(() => app.disableModule('content-script-tests'));

      it('does not run content script', async () => {
        await newTab('http://example.com');
        const timeout = new Promise(resolve => setTimeout(resolve, 500));
        const failOnMessage = new Promise((resolve, reject) => {
          onMessage.then(reject);
        });
        return Promise.race([timeout, failOnMessage]);
      });

      afterEach(() => app.enableModule('content-script-tests'));
    });
  });
}
