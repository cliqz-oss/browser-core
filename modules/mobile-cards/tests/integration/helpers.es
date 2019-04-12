import {
  expect,
  getElements,
  getLocalisedString,
  getResourceUrl,
  prefs,
  queryComputedStyle,
  queryHTML,
  waitFor,
} from '../../../tests/core/integration/helpers';

import { getMessage } from '../../../core/i18n';

import { getDetailsFromUrl } from '../../../core/url';

export const cardsUrl = getResourceUrl('mobile-cards/cards.html');

export * from '../../../tests/core/integration/search-helpers';
export {
  getElements,
  getLocalisedString,
  queryHTML
} from '../../../tests/core/integration/helpers';

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
    const headerSelector = '[aria-label="header-container"]';
    const isSecure = results[0].url.startsWith('https');

    it('is rendered successfully', async function () {
      const $cardHeaders = await getElements({
        elementSelector: headerSelector,
        url,
      });
      expect($cardHeaders).to.have.length(1);
    });

    it('renders correct friendlyUrl', async function () {
      const $cardHeaders = await getElements({
        elementSelector: headerSelector,
        url,
      });

      expect($cardHeaders).to.have.length(1);

      const $friendlyUrl = $cardHeaders[0].querySelector('[aria-label="generic-link"]');

      expect($friendlyUrl).to.exist;
      if (results[0].snippet.friendlyUrl) {
        expect($friendlyUrl.innerText).to.equal(results[0].snippet.friendlyUrl);
      } else {
        expect($friendlyUrl.innerText).to.equal(getDetailsFromUrl(results[0].url).friendly_url);
      }
    });

    it(`${isSecure ? 'renders' : 'doesn\'t render'} https lock logo`, async function () {
      const $cardHeaders = await getElements({
        elementSelector: headerSelector,
        url,
      });

      expect($cardHeaders).to.have.length(1);

      const $logo = $cardHeaders[0].querySelector('[aria-label="https-lock"] img');

      if (isSecure) {
        expect($logo).to.exist;
        expect($logo.src).to.contain('img/https_lock.svg');
      } else {
        expect($logo).to.not.exist;
      }
    });

    it('renders correct logo', async function () {
      const logoVersion = prefs.get('config_logoVersion');
      let $logo;

      await waitFor(async function () {
        const $cardHeaders = await getElements({
          elementSelector: headerSelector,
          url,
        });

        expect($cardHeaders).to.have.length(1);

        if (isDefault) {
          $logo = $cardHeaders[0].querySelector('[aria-label="default-icon"]');
          expect($logo).to.exist;
          return expect($logo.textContent).to.equal(imageName);
        }

        $logo = $cardHeaders[0].querySelector('[aria-label="header-container"] [aria-label="generic-logo"] img');
        expect($logo).to.exist;
        return expect($logo.src).to.contain(`https://cdn.cliqz.com/brands-database/database/${logoVersion}/logos/${imageName}/$.svg`);
      }, 5000);
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
      const logoVersion = prefs.get('config_logoVersion');
      const $comSearchCardsLogos = await getElements({
        elementSelector: '[aria-label="complementary-search-card"] [aria-label="generic-logo"] img',
        parentElementSelector: '.carousel-track',
        url,
      });

      expect($comSearchCardsLogos).to.have.length(1);
      expect($comSearchCardsLogos[0].src).to.exist;
      expect($comSearchCardsLogos[0].src).to.contain(`https://cdn.cliqz.com/brands-database/database/${logoVersion}/logos/${searchEngine}/$.svg`);
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

export function checkPoweredBySection({ url }) {
  context('"powered by" section', function () {
    it('with correct url', async function () {
      const $poweredByUrl = await getElements({
        elementSelector: '[aria-label="powered-by"]',
        url,
      });

      expect($poweredByUrl).to.have.length(1);
      expect($poweredByUrl[0]).to.have.attribute('data-url');
      expect($poweredByUrl[0].getAttribute('data-url'))
        .to.equal('http://www.kicker.de/?gomobile=1');
    });

    it('with correct icon', async function () {
      const $poweredByIcon = await getElements({
        elementSelector: '[aria-label="powered-by-icon"]',
        url,
      });
      const $logoStyle = await queryComputedStyle(url, '[aria-label="powered-by-icon"] [aria-label="generic-logo"]');
      expect($poweredByIcon).to.have.length(1);
      expect($logoStyle[0].backgroundColor).to.equal('rgb(215, 1, 29)');
    });

    it('with correct text', async function () {
      const $poweredByText = await getElements({
        elementSelector: '[aria-label="powered-by-text"]',
        url,
      });

      expect($poweredByText).to.have.length(1);
      expect($poweredByText[0]).to.have.text(getMessage('kicker_sponsor'));
    });
  });
}
