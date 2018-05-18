import {
  blurUrlBar,
  fillIn,
  respondWith,
  urlbar,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';

export default function () {
  context('clean urlbar value function tests', function () {
    const testArray = [
      { query: 'www,', expected: 'www,' },
      { query: 'www,a', expected: 'www.a' },
      { query: 'http://www,', expected: 'http://www,' },
      { query: 'http://www,f', expected: 'http://www.f' },
      { query: 'https://www,', expected: 'https://www,' },
      { query: 'https://www,f', expected: 'https://www.f' },
      { query: 'www,facebook,c', expected: 'www.facebook.c' },
      { query: 'wwwf,c', expected: 'wwwf,c' },
      { query: 'www,facebook,com/path,path/', expected: 'www.facebook.com/path,path/' },
      { query: 'www,face book.com', expected: 'www,face book.com' },
      { query: 'www,dash-test,com', expected: 'www.dash-test.com' },
    ];

    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      withHistory([]);
      respondWith({ results: [] });
      fillIn('test start');
      await waitForPopup(1);
    });

    after(function () {
      window.preventRestarts = false;
    });

    testArray.forEach(function (testCase) {
      it(`query: "${testCase.query}", expected: "${testCase.expected}"`, function () {
        withHistory([]);
        respondWith({ results: [] });
        fillIn(testCase.query);
        return waitFor(
          () => urlbar.textValue === testCase.expected
        );
      });
    });
  });
}
