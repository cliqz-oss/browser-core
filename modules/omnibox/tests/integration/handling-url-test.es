import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  withHistory,
} from './helpers';

export default function () {
  context('url handling', function () {
    let $resultElement;
    const testArray = [
      // valid urls
      { query: 'http://www.f', isUrl: true },
      { query: 'https://www.f', isUrl: true },
      { query: 'http://f', isUrl: true },
      { query: 'https://f', isUrl: true },
      { query: 'ftp://f', isUrl: true },
      { query: 'http://foo.com/test_test_(wikipedia)', isUrl: true },
      { query: "http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com", isUrl: true },
      { query: 'http://foo.bar?q=with spaces is fine', isUrl: true },
      { query: 'www.sd', isUrl: true },
      { query: 'www.face.co.uk', isUrl: true },
      { query: '1234.net', isUrl: true },
      { query: '142.42.1.1', isUrl: true },
      { query: '2.2', isUrl: true },
      { query: 'http://userid@example.com', isUrl: true },
      { query: '142.42.1.1:8080/', isUrl: true },
      { query: 'http:////a', isUrl: true },
      { query: 'about:blank', isUrl: true },
      { query: 'mailto:asdf@example.com', isUrl: true },

      // invalid urls
      { query: 'http://', isUrl: false },
      { query: 'https://', isUrl: false },
      { query: 'ftp://', isUrl: false },
      { query: 'http://?', isUrl: false },
      { query: 'www.f', isUrl: false },
      { query: 'www.', isUrl: false },
      { query: 'file:', isUrl: false },
      { query: 'about:', isUrl: false },
      { query: 'KeyError: \'credential_provider\'', isUrl: false },
      { query: 'facebook.c]', isUrl: false },
      { query: 'anything://test', isUrl: false },
    ];

    before(async function () {
      await blurUrlBar();
    });

    testArray.forEach(function (testCase) {
      context(`query: "${testCase.query}"`, function () {
        beforeEach(async function () {
          withHistory([]);
          await mockSearch({ results: [] });
          fillIn(testCase.query);
          await waitForPopup(0);
          await waitFor(async () => {
            $resultElement = await $cliqzResults.querySelector('.result');
            return $resultElement.textContent.includes(testCase.query);
          });
        });

        if (testCase.isUrl) {
          it('renders "Visit"', function () {
            expect($resultElement).to.not.have.class('search');
            expect($resultElement.textContent).to.contain('Visit');
          });
        } else {
          it('renders "Search with"', function () {
            expect($resultElement).to.have.class('search');
            expect($resultElement.textContent).to.contain('Search');
          });
        }
      });
    });
  });
}
