import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fastFillIn,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory,
} from './helpers';

export default function () {
  if (!testsEnabled()) { return; }

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
      { query: '2.2', isUrl: true }, // this goes to 2.0.0.2
      { query: 'http://userid@example.com', isUrl: true },
      { query: '142.42.1.1:8080/', isUrl: true },
      { query: 'http:////a', isUrl: true },
      { query: 'about:blank', isUrl: true },
      { query: 'mailto:asdf@example.com', isUrl: true },

      // invalid urls
      // uncomment this after removing FF 52 from CI
      { query: 'http://', isUrl: false },
      { query: 'https://', isUrl: false },
      { query: 'ftp://', isUrl: false },
      { query: 'http://?', isUrl: false },
      { query: 'www.f', isUrl: false },
      { query: 'www.', isUrl: false },
      { query: 'file:', isUrl: false },
      { query: 'about:', isUrl: false },
      { query: 'KeyError: \'credential_provider\'', isUrl: false },

      // these are shown as 'visit', but go to google
      { query: 'facebook.c]', isUrl: false },
      { query: 'anything://test', isUrl: false },
    ];

    before(function () {
      blurUrlBar();
    });

    testArray.forEach(function (testCase) {
      context(`query: "${testCase.query}"`, function () {
        beforeEach(async function () {
          withHistory([]);
          await mockSearch({ results: [] });
          fastFillIn(testCase.query);
          await waitForPopup(1);
          await waitFor(() => $cliqzResults.querySelector('.result')
            .textContent.includes(testCase.query));
          $resultElement = $cliqzResults.querySelector('.result');
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
