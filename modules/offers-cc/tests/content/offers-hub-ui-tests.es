import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {dataNewOffer, dataOldOffer, dataNewOldOffer} from './fixtures/offers';

describe('Offers Hub UI tests', function () {
  let subject;

  afterEach(function () {
    clearIntervals();
  });

  function offersHubFrameTests() {
    context('renders offers hub header and footer elements', function () {
      it('renders hub title', function () {
        const titleSelector = 'header [data-i18n="offers-hub-title"';
        chai.expect(subject.query(titleSelector)).to.exist;
        chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('offers-hub-title');
      });

      it('renders close button', function () {
        const buttonSelector = 'header .cqz-close-hub';
        chai.expect(subject.query(buttonSelector)).to.exist;
      });

      it('renders "more information"', function () {
        const moreInfoSelector = 'footer .cqz-power-by';
        chai.expect(subject.query(moreInfoSelector)).to.exist;
        chai.expect(subject.query(moreInfoSelector).textContent.trim()).to.equal('offers-hub-about-cliqz-offers');
      });

      it('link is correct', function () {
        const moreInfoSelector = 'footer .cqz-power-by';
        chai.expect(subject.query(moreInfoSelector).hasAttribute('openurl')).to.be.true;
        chai.expect(subject.query(moreInfoSelector).getAttribute('openurl')).to.equal('https://cliqz.com/myoffrz');
      });

      it('renders "powered by Cliqz"', function () {
        const poweredBySelector = 'footer .powered-by [data-i18n="offers-hub-powered-by"]';
        chai.expect(subject.query(poweredBySelector)).to.exist;
        chai.expect(subject.query(poweredBySelector).textContent.trim()).to.equal('offers-hub-powered-by');
      });
    });
  };

  function noOffersMessageTests() {
    it('vouchers section exists', function () {
      chai.expect(subject.query('#cqz-vouchers-wrapper')).to.exist;
    });

    it('renders "no offers" message', function () {
      const noVouchersSelector = '#cqz-vouchers-wrapper .cqz-no-vouchers-msg';
      const titleSelector = '[data-i18n=offers-hub-welcome-title]';
      const textSelector = '[data-i18n=offers-hub-welcome-text]';
      chai.expect(subject.query(noVouchersSelector)).to.exist;
      chai.expect(subject.getComputedStyle(noVouchersSelector).display).to.not.equal('none');
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('offers-hub-welcome-title');
      chai.expect(subject.query(textSelector)).to.exist;
      chai.expect(subject.query(textSelector).textContent.trim()).to.equal('offers-hub-welcome-text');
    });
  };

  function isInvisible(selector) {
    chai.expect(subject.query(selector)).to.exist;
    chai.expect(subject.getComputedStyle(selector).display).to.equal('none');
  };

  function offerTests(selector, data, index) {
    const element = data[index];

    it('renders offer', function () {
      chai.expect(subject.query(selector)).to.exist;
      chai.expect(subject.getComputedStyle(selector).display).to.not.equal('none');
    });

    it('renders title', function () {
      chai.expect(subject.query(`${selector} .cqz-title`)).to.exist;
      chai.expect(subject.query(`${selector} .cqz-title`).textContent.trim()).to.equal(element.template_data.title);
    });

    it('renders description', function () {
      chai.expect(subject.query(`${selector} .cqz-descr`)).to.exist;
      chai.expect(subject.query(`${selector} .cqz-descr`).textContent.trim()).to.equal(element.template_data.desc);
    });

    it('renders conditions', function () {
      chai.expect(subject.query(`${selector} .descr-read-more .text-holder`)).to.exist;
      chai.expect(subject.query(`${selector} .descr-read-more .text-holder`).textContent.trim()).to.equal(element.template_data.conditions);
    });

    it('renders logo', function () {
      chai.expect(subject.query(`${selector} .cqz-offer-holder`)).to.exist;
      chai.expect(subject.query(`${selector} .cqz-offer-holder`).style.backgroundImage).to.equal(`url("${element.template_data.logo_url}")`);
    });

    it('renders code', function () {
      chai.expect(subject.query(`${selector} .cqz-offer-code`)).to.exist;
      chai.expect(subject.query(`${selector} .cqz-offer-code`).textContent.trim()).to.equal(element.template_data.code);
    });

    it('renders button', function () {
      chai.expect(subject.query(`${selector} .cqz-btn`)).to.exist;
      chai.expect(subject.query(`${selector} .cqz-btn`).textContent.trim()).to.equal(element.template_data.call_to_action.text);
    });

    it('url for button is correct', function () {
      chai.expect(subject.query(`${selector} .cqz-btn`).hasAttribute('openurl')).to.be.true;
      chai.expect(subject.query(`${selector} .cqz-btn`).getAttribute('openurl')).to.equal(element.template_data.call_to_action.url);
    });

    it('code copied is hidden', function () {
      chai.expect(subject.getComputedStyle('.cqz-offer-code-holder .cqz-offer-code-info').opacity).to.equal('0');
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('empty offers hub', function () {
    before(() => {
      subject = new Subject();
      return subject.load().then(() => {
        return subject.pushData();
      });
    });

    after(function () {
      subject.unload();
    });

    it('empty vouchers section', function () {
      chai.expect(subject.query('#cqz-vouchers-wrapper .cqz-vouchers-inner-holder')).to.exist;
      chai.expect(subject.query('#cqz-vouchers-wrapper #cqz-new-vouchers-holder')).to.exist;
      chai.expect(subject.query('#cqz-vouchers-wrapper #cqz-new-vouchers-holder').innerHTML).to.equal('');
      chai.expect(subject.query('#cqz-vouchers-wrapper #cqz-recent-vouchers-holder')).to.exist;
      chai.expect(subject.query('#cqz-vouchers-wrapper #cqz-recent-vouchers-holder').innerHTML).to.equal('');
    });
  });

  describe('"no offers" message', function () {
    before(() => {
      subject = new Subject();
      return subject.load().then(() => {
        return subject.pushData([]);
      });
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();
    noOffersMessageTests();

    it('no other elements', function () {
      const removeFeedbackSelector = '#cqz-vouchers-wrapper .cqz-remove-feedback';
      isInvisible(removeFeedbackSelector);
    });
  });

  describe('one new offer', function () {
    const newOfferSelector = '#cqz-new-vouchers-holder';

    before(() => {
      subject = new Subject();
      return subject.load().then(() => {
        return subject.pushData(dataNewOffer);
      });
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();
    offerTests(newOfferSelector, dataNewOffer, 0);

    it('no other elements', function () {
      const oldOfferSelector = '#cqz-vouchers-wrapper #cqz-recent-vouchers-holder';
      const noVouchersMsgSelector = '#cqz-vouchers-wrapper .cqz-no-vouchers-msg';
      const removeFeedbackSelector = '#cqz-vouchers-wrapper .cqz-remove-feedback';
      isInvisible(oldOfferSelector);
      isInvisible(noVouchersMsgSelector);
      isInvisible(removeFeedbackSelector);
    });
  });

  describe('one old offer', function () {
    const recentOfferSelector = '#cqz-recent-vouchers-holder';

    before(() => {
      subject = new Subject();
      return subject.load().then(() => {
        return subject.pushData(dataOldOffer);
      });
    });

    after(function () {
      subject.unload();
    });

    offersHubFrameTests();
    offerTests(recentOfferSelector, dataOldOffer, 0);

    it('no other elements', function () {
      const noVouchersMsgSelector = '#cqz-vouchers-wrapper .cqz-no-vouchers-msg';
      const removeFeedbackSelector = '#cqz-vouchers-wrapper .cqz-remove-feedback';
      isInvisible(noVouchersMsgSelector);
      isInvisible(removeFeedbackSelector);
    });
  });

  describe('new offer and old offer', function () {
    const newOfferSelector = '#cqz-new-vouchers-holder';
    const recentOfferSelector = '#cqz-recent-vouchers-holder';

    before(() => {
      subject = new Subject();
      return subject.load().then(() => {
        return subject.pushData(dataNewOldOffer);
      });
    });

    after(function () {
      subject.unload();
    });

    context('renders new offer', function () {
      const newOfferSelector = '#cqz-new-vouchers-holder';
      offerTests(newOfferSelector, dataNewOldOffer, 0);
    });

    it('renders button "Show all offers"', function () {
      chai.expect(subject.query('.cqz-show-all-offers')).to.exist;
      chai.expect(subject.query('.cqz-show-all-offers').textContent.trim()).to.equal('offers-hub-show-all-offers-btn');
    });

    it('recent offer hidden', function () {
      const oldOfferSelector = '#cqz-recent-vouchers-holder';
      isInvisible(oldOfferSelector);
    });

    it('no other elements', function () {
      const noVouchersMsgSelector = '#cqz-vouchers-wrapper .cqz-no-vouchers-msg';
      const removeFeedbackSelector = '#cqz-vouchers-wrapper .cqz-remove-feedback';
      isInvisible(noVouchersMsgSelector);
      isInvisible(removeFeedbackSelector);
    });
  });
})
