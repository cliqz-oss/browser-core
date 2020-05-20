import {
  app,
  expect,
  testServer,
} from '../../../tests/core/integration/helpers';

export default function () {
  // these tests are only for configs with cookies permissions
  if (chrome.cookies) {
    describe('Humanweb doublefetch tests', function () {
      const testPath = '/cookie';
      const testCookieName = 'COOKIE';
      const testCookieValue = '1234';

      const getCookie = testUrl => new Promise(resolve => chrome.cookies.get({
        name: testCookieName,
        url: testUrl,
      }, resolve));

      beforeEach(async () => {
        await testServer.registerPathHandler(testPath, {
          result: '<html><body><p>Hello world</p></body></html',
          headers: [{
            name: 'Set-Cookie',
            value: `${testCookieName}=${testCookieValue}; Path=${testPath}; Max-Age=60`
          }]
        });
      });

      afterEach(() => new Promise(resolve => chrome.cookies.remove({
        name: testCookieName,
        url: testServer.getBaseUrl(testPath),
      }, resolve)));

      it('does not cause cookies to be set', async () => {
        const hw = app.modules['human-web'].background.humanWeb;
        const testUrl = testServer.getBaseUrl(testPath);
        await hw.doublefetchHandler.anonymousHttpGet(testUrl);
        const cookie = await getCookie(testUrl);
        expect(cookie).to.be.null;
      });
    });
  }
}
