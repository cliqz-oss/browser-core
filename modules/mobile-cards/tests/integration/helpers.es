import {
  expect,
  getLocalisedString,
  getResourceUrl,
  queryComputedStyle,
  queryHTML,
  waitForAsync,
} from '../../../tests/core/integration/helpers';

export const cardsUrl = getResourceUrl('mobile-cards/cards.html');

export * from '../../../tests/core/integration/search-helpers';
export {
  getLocalisedString,
  queryHTML
} from '../../../tests/core/integration/helpers';

function getElementsFromParsedHTML({ rawHTML, selector }) {
  return new DOMParser().parseFromString(rawHTML, 'text/html')
    .querySelectorAll(selector);
}

export async function getElements({
  elementSelector,
  parentElementSelector = '[aria-label="result-card-0"]',
  url,
}) {
  const $elementsFromParsedHTML = [];

  return waitForAsync(async () => {
    const results = await queryHTML(url, parentElementSelector, 'innerHTML');

    if (results) {
      results.forEach((r) => {
        const $el = getElementsFromParsedHTML({ rawHTML: r, selector: elementSelector });
        [...$el].map($e => $elementsFromParsedHTML.push($e));
      });
      return $elementsFromParsedHTML;
    }

    return null;
  });
}

export function checkMainUrl({ url, mainUrl }) {
  it('renders main result with correct url', async function () {
    const $mainUrl = await getElements({
      elementSelector: '[aria-label="main-url"]',
      url,
    });

    expect($mainUrl).to.have.length(1);
    expect($mainUrl[0].dataset.url).to.exist;
    expect($mainUrl[0].dataset.url).to.equal(mainUrl);
  });
}

export function checkButtons({ url, results, numberButtons }) {
  let $buttons;

  it('renders correct number of buttons', async function () {
    $buttons = await getElements({
      elementSelector: '[aria-label="simple-link"]',
      url,
    });
    expect($buttons).to.have.length(numberButtons);
  });

  it('renders buttons with correct text', async function () {
    $buttons = await getElements({
      elementSelector: '[aria-label="simple-link"]',
      url,
    });

    expect($buttons.length).to.be.above(0);
    [...$buttons].forEach(($button, i) => {
      expect($button.innerText).to.equal(results[0].snippet.deepResults[0].links[i].title);
    });
  });

  it('renders buttons with correct urls', async function () {
    $buttons = await getElements({
      elementSelector: '[aria-label="simple-link"]',
      url,
    });

    expect($buttons).to.have.length(numberButtons);
    [...$buttons].forEach(($button, i) => {
      expect($button.dataset.url).to.exist;
      expect($button.dataset.url)
        .to.equal(results[0].snippet.deepResults[0].links[i].url);
    });
  });
}

export function checkHeader({ url, results, isDefault = false, imageName }) {
  context('card header', function () {
    const isSecure = results[0].url.startsWith('https');

    it('renders correct friendlyUrl', async function () {
      const $friendlyUrl = await getElements({
        elementSelector: '[aria-label="generic-link"]',
        url,
      });

      expect($friendlyUrl).to.have.length(1);
      expect($friendlyUrl[0].innerText).to.equal(results[0].snippet.friendlyUrl);
    });

    it(`${isSecure ? 'renders' : 'doesn\'t render'} https lock logo`, async function () {
      const $logos = await getElements({
        elementSelector: '[aria-label="https-lock"] img',
        url,
      });

      expect($logos).to.have.length(isSecure ? 1 : 0);
      if (isSecure) {
        expect($logos[0].src).to.contain('img/https_lock.svg');
      }
    });

    it('renders correct logo', async function () {
      let $logos;

      if (isDefault) {
        $logos = await getElements({
          elementSelector: '[aria-label="default-icon"]',
          url,
        });
        expect($logos).to.have.length(1);
        expect($logos[0].textContent).to.equal(imageName);
      } else {
        $logos = await getElements({
          elementSelector: '[aria-label="generic-logo"] img',
          url,
        });
        expect($logos).to.have.length(1);
        expect($logos[0].src).to.contain(`https://cdn.cliqz.com/brands-database/database/1521469421408/logos/${imageName}/$.svg`);
      }
    });
  });
}

export function checkComplementarySearchCard({
  searchEngine = 'google',
  url
}) {
  context('renders a complementary search card', function () {
    let $comSearchCards;

    it('successfully', async function () {
      $comSearchCards = await getElements({
        elementSelector: '[aria-label="complementary-search-card"]',
        parentElementSelector: '.carousel-track',
        url,
      });
      expect($comSearchCards).to.have.length(1);
    });

    it('with correct message', async function () {
      $comSearchCards = await getElements({
        elementSelector: '[aria-label="complementary-search-card"]',
        parentElementSelector: '.carousel-track',
        url,
      });
      const message = getLocalisedString('mobile_more_results_title');

      expect($comSearchCards).to.have.length(1);
      expect($comSearchCards[0].innerText).to.equal(message);
    });

    it('with correct search engine logo', async function () {
      const $comSearchCardsLogos = await getElements({
        elementSelector: '[aria-label="complementary-search-card"] [aria-label="generic-logo"] img',
        parentElementSelector: '.carousel-track',
        url,
      });

      expect($comSearchCardsLogos).to.have.length(1);
      expect($comSearchCardsLogos[0].src).to.exist;
      expect($comSearchCardsLogos[0].src).to.contain(`https://cdn.cliqz.com/brands-database/database/1521469421408/logos/${searchEngine}/$.svg`);
    });

    it('with correct search engine url', async function () {
      $comSearchCards = await getElements({
        elementSelector: '[aria-label="complementary-search-link"]',
        parentElementSelector: '.carousel-track',
        url,
      });

      expect($comSearchCards).to.have.length(1);
      expect($comSearchCards[0].dataset.url).to.exist;
      expect($comSearchCards[0].dataset.url).to.contain(searchEngine);
    });

    it('with correct background color', async function () {
      const comSearchCardStyle = await queryComputedStyle(
        cardsUrl,
        '[aria-label="complementary-search-card-content"]'
      );

      expect(comSearchCardStyle).to.have.length(1);
      expect(comSearchCardStyle[0].backgroundColor)
        .to.equal('rgb(94, 163, 249)');
    });
  });
}

export function checkTapMessage({ url }) {
  it('renders correct copy message', async function () {
    const copyMessage = await queryHTML(url, '[aria-label="generic-copy-msg"]', 'innerText');
    const copyMessageString = getLocalisedString('mobile_calc_copy_ans');

    expect(copyMessage).to.have.length(1);
    expect(copyMessage[0]).to.equal(copyMessageString);
  });
}

export function checkMoreOn({ url, moreUrl }) {
  it('renders correct "more" link', async function () {
    const $moreOn = await getElements({
      elementSelector: '[aria-label="generic-more-on"]',
      url,
    });
    const moreOnString = getLocalisedString('more_on');

    expect($moreOn).to.have.length(1);
    expect($moreOn[0].textContent).to.contain(moreOnString);
    expect($moreOn[0].textContent).to.contain(moreUrl);

    expect($moreOn[0].dataset.url).to.exist;
  });
}
