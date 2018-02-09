import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject,
  start
} from './helpers';

import {dataNewOffer, dataOldOffer, dataNewOldOffer} from './fixtures/offers';

describe('Offers Hub Interaction tests', function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function clickButtonAndWait(selector) {
    beforeEach(function() {
      subject.query(selector).click();
      return waitFor(
        () => subject.messages.find(message => message.message.action === "resize")
      ).then(
        () => {}
      );
    });
  };

  function feedbackWindowTests() {
    context('feedback window', function () {
      it('loads', function () {
        chai.expect(subject.query('.cqz-remove-feedback')).to.exist;
        chai.expect(subject.getComputedStyle('.cqz-remove-feedback').display).to.not.equal('none');
      });

      it('renders title', function () {
        chai.expect(subject.query('[data-i18n="offers-hub-feedback-title"]')).to.exist;
        chai.expect(subject.query('[data-i18n="offers-hub-feedback-title"]').textContent.trim()).to.equal('offers-hub-feedback-title');
      });

      it('renders subtitle', function () {
        chai.expect(subject.query('[data-i18n="offers-hub-feedaback-sub-title"]')).to.exist;
        chai.expect(subject.query('[data-i18n="offers-hub-feedaback-sub-title"]').textContent.trim()).to.equal('offers-hub-feedaback-sub-title');
      });

      it('renders three options', function () {
        const options = subject.queryAll('.cqz-remove-feedback .holder li');
        chai.expect(options.length).to.equal(3);
      });

      it('renders options with correct titles', function () {
        const options = subject.queryAll('.cqz-remove-feedback .holder li');
        chai.expect(options[0].querySelector('[data-i18n="offers-hub-feedaback-option1"')).to.exist;
        chai.expect(options[0].querySelector('[data-i18n="offers-hub-feedaback-option1"').textContent.trim()).to.equal('offers-hub-feedaback-option1');
        chai.expect(options[1].querySelector('[data-i18n="offers-hub-feedaback-option2"')).to.exist;
        chai.expect(options[1].querySelector('[data-i18n="offers-hub-feedaback-option2"').textContent.trim()).to.equal('offers-hub-feedaback-option2');
        chai.expect(options[2].querySelector('[data-i18n="offers-hub-feedaback-option3"')).to.exist;
        chai.expect(options[2].querySelector('[data-i18n="offers-hub-feedaback-option3"').textContent.trim()).to.equal('offers-hub-feedaback-option3');
      });

      it('renders unchecked radio buttons', function () {
        const options = subject.queryAll('.cqz-remove-feedback .holder li');
        [].forEach.call(options, function (option, i) {
          chai.expect(option.querySelector('[name="remove_feedback"]').getAttribute('type')).to.equal('radio');
          chai.expect(option.querySelector('[name="remove_feedback"]').checked).to.be.false;
        });
      });

      it('renders remove button', function () {
        chai.expect(subject.query('.cqz-remove-feedback .remove-offer.button')).to.exist;
        chai.expect(subject.query('.cqz-remove-feedback .remove-offer.button').textContent.trim()).to.equal('offers-hub-remove');
      });

      it('renders cancel button', function () {
        chai.expect(subject.query('.cqz-remove-feedback .cancel-feedback.button')).to.exist;
        chai.expect(subject.query('.cqz-remove-feedback .cancel-feedback.button').textContent.trim()).to.equal('offers-hub-cancel');
      });

      checkRadioButtons(0);

      checkRadioButtons(1);

      checkRadioButtons(2);
    });
  };

  function noOffersMessageTests() {
    it('vouchers section exists', function () {
      chai.expect(subject.query('#cqz-vouchers-wrapper')).to.exist;
    });

    it('renders "no offers" message', function () {
      chai.expect(subject.query('#cqz-vouchers-wrapper .cqz-no-vouchers-msg')).to.exist;
      chai.expect(subject.getComputedStyle('#cqz-vouchers-wrapper .cqz-no-vouchers-msg').display).to.not.equal('none');
      chai.expect(subject.query('[data-i18n=offers-hub-welcome-title]')).to.exist;
      chai.expect(subject.query('[data-i18n=offers-hub-welcome-title]').textContent.trim()).to.equal('offers-hub-welcome-title');
      chai.expect(subject.query('[data-i18n=offers-hub-welcome-text]')).to.exist;
      chai.expect(subject.query('[data-i18n=offers-hub-welcome-text]').textContent.trim()).to.equal('offers-hub-welcome-text');
    });
  };

  function checkRadioButtons(index) {
    describe(`click on the option ${index + 1}`, function () {
      clickButtonAndWait(`input[value="feedback_option${index + 1}"]`);
      it(`option ${index + 1} is checked`, function () {
        const options = subject.queryAll('.cqz-remove-feedback .holder li');
        chai.expect(options[index].querySelector('input[name="remove_feedback"]').checked).to.be.true;
        chai.expect(options[(index + 1) % 3].querySelector('input[name="remove_feedback"]').checked).to.be.false;
        chai.expect(options[(index + 2) % 3].querySelector('input[name="remove_feedback"]').checked).to.be.false;
      });
    });
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
      chai.expect(subject.query(`${selector} .cqz-btn`).hasAttribute('data-open-url')).to.be.true;
      chai.expect(subject.query(`${selector} .cqz-btn`).getAttribute('data-open-url')).to.equal(element.template_data.call_to_action.url);
    });

    it('code copied is hidden', function () {
      chai.expect(subject.getComputedStyle('.cqz-offer-code-holder .cqz-offer-code-info').opacity).to.equal('0');
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('push one new offer', function () {
    const newOfferSelector = '#cqz-new-vouchers-holder';

    beforeEach(() => {
      return subject.pushData(dataNewOffer);
    });

    it('renders offer', function () {
      chai.expect(subject.query(newOfferSelector)).to.exist;
      chai.expect(subject.getComputedStyle(newOfferSelector).display).to.not.equal('none');
    });

    it('code button exists', function () {
      const buttonSelector = '#cqz-new-vouchers-holder .cqz-offer-code';
      chai.expect(subject.query(buttonSelector)).to.exist;
    });

    it('text "code copied" exists but invisible', function () {
      const textSelector = '#cqz-new-vouchers-holder .cqz-offer-code-holder .cqz-offer-code-info';
      chai.expect(subject.query(textSelector)).to.exist;
      chai.expect(subject.getComputedStyle(textSelector).opacity).to.equal('0');
    });

    describe('click on the code button', function () {
      let execCommand;

      beforeEach(function() {
        execCommand = subject.iframe.contentWindow.document.execCommand
        subject.iframe.contentWindow.document.execCommand = () => true;
        subject.query('#cqz-new-vouchers-holder .cqz-offer-code').click();

        return waitFor(
          () => subject.getComputedStyle('#cqz-new-vouchers-holder .cqz-offer-code-holder .cqz-offer-code-info').opacity === '1'
        )
      });

      afterEach(function () {
        subject.iframe.contentWindow.document.execCommand = execCommand;
      });

      it('"code copied" appeared', function () {
        chai.expect(subject.query('#cqz-new-vouchers-holder .cqz-offer-code-holder').classList.contains('copied')).to.be.true;
        chai.expect(subject.query('#cqz-new-vouchers-holder .cqz-offer-code-info')).to.exist;
        chai.expect(subject.query('#cqz-new-vouchers-holder .cqz-offer-code-info').textContent.trim()).to.equal('offers-hub-code-copy');
      });
    });

    describe('click on "close offer" button', function () {
      clickButtonAndWait('#cqz-new-vouchers-holder .cqz-close');

      feedbackWindowTests();

      describe('click on remove button', function () {
        clickButtonAndWait('.cqz-remove-feedback .remove-offer.button');

        context('renders "no offers" message', function () {
          noOffersMessageTests();
        });
      });

      describe('click on cancel button', function () {
        clickButtonAndWait('.cqz-remove-feedback .cancel-feedback.button');

        it('offer exists', function () {
          chai.expect(subject.query('#cqz-new-vouchers-holder .cqz-offer-holder')).to.exist;
        });
      });
    });
  });

  describe('push one old offer', function () {
    const recentOfferSelector = '#cqz-recent-vouchers-holder';

    beforeEach(() => {
      return subject.pushData(dataOldOffer);
    });

    it('renders offer', function () {
      chai.expect(subject.query(recentOfferSelector)).to.exist;
      chai.expect(subject.getComputedStyle(recentOfferSelector).display).to.not.equal('none');
    });

    it('code button exists', function () {
      const buttonSelector = '#cqz-recent-vouchers-holder .cqz-offer-code';
      chai.expect(subject.query(buttonSelector)).to.exist;
    });

    it('text "code copied" exists but invisible', function () {
      const textSelector = '#cqz-recent-vouchers-holder .cqz-offer-code-holder .cqz-offer-code-info';
      chai.expect(subject.query(textSelector)).to.exist;
      chai.expect(subject.getComputedStyle(textSelector).opacity).to.equal('0');
    });

    describe('click on the code button', function () {
      let execCommand;

      beforeEach(function() {
        execCommand = subject.iframe.contentWindow.document.execCommand
        subject.iframe.contentWindow.document.execCommand = () => true;
        subject.query('#cqz-recent-vouchers-holder .cqz-offer-code').click();

        return waitFor(
          () => subject.getComputedStyle('#cqz-recent-vouchers-holder .cqz-offer-code-holder .cqz-offer-code-info').opacity === '1'
        )
      });

      afterEach(function () {
        subject.iframe.contentWindow.document.execCommand = execCommand;
      });

      it('"code copied" appeared', function () {
        chai.expect(subject.query('#cqz-recent-vouchers-holder .cqz-offer-code-holder').classList.contains('copied')).to.be.true;
        chai.expect(subject.query('#cqz-recent-vouchers-holder .cqz-offer-code-info')).to.exist;
        chai.expect(subject.query('#cqz-recent-vouchers-holder .cqz-offer-code-info').textContent.trim()).to.equal('offers-hub-code-copy');
      });
    });

    describe('click on "close offer" button', function () {
      clickButtonAndWait('#cqz-recent-vouchers-holder .cqz-close');

      feedbackWindowTests();

      describe('click on remove button', function () {
        clickButtonAndWait('.cqz-remove-feedback .remove-offer.button');

        context('renders "no offers" message', function () {
          noOffersMessageTests();
        });
      });

      describe('click on cancel button', function () {
        clickButtonAndWait('.cqz-remove-feedback .cancel-feedback.button');

        it('offer exists', function () {
          chai.expect(subject.query('#cqz-recent-vouchers-holder .cqz-offer-holder')).to.exist;
        });
      });
    });

  });

  describe('push new and old offer', function () {
    const newOfferSelector = '#cqz-new-vouchers-holder';
    const recentOfferSelector = '#cqz-recent-vouchers-holder';

    beforeEach(() => {
      return subject.pushData(dataNewOldOffer);
    });

    describe('after clicking on button "Show all offers"', function() {
      clickButtonAndWait('.cqz-show-all-offers');

      context('renders new offer', function () {
        offerTests(newOfferSelector, dataNewOldOffer, 0);
      });

      context('renders old offer', function () {
        offerTests(recentOfferSelector, dataNewOldOffer, 1);
      });

      describe('close first offer', function () {
        describe('click on "close" button for new offer', function () {
          const buttonSelector = '#cqz-new-vouchers-holder .cqz-close';
          clickButtonAndWait(buttonSelector);

          feedbackWindowTests();

          describe('click on remove button', function () {
            clickButtonAndWait('.cqz-remove-feedback .remove-offer.button');

            context('renders recent offer', function () {
              offerTests(recentOfferSelector, dataNewOldOffer, 1);
            });
          });

          describe('click on cancel button', function () {
            clickButtonAndWait('.cqz-remove-feedback .cancel-feedback.button');

            context('renders new offer', function () {
              offerTests(newOfferSelector, dataNewOldOffer, 0);
            });
          });
        });
      });
      describe('close second offer', function () {
        describe('click on "close" button for new offer', function () {
          const buttonSelector = '#cqz-recent-vouchers-holder .cqz-close';
          clickButtonAndWait(buttonSelector);

          feedbackWindowTests();

          describe('click on remove button', function () {
            clickButtonAndWait('.cqz-remove-feedback .remove-offer.button');

            context('renders recent offer', function () {
              offerTests(recentOfferSelector, dataNewOldOffer, 1);
            });
          });

          describe('click on cancel button', function () {
            clickButtonAndWait('.cqz-remove-feedback .cancel-feedback.button');

            context('renders new offer', function () {
              offerTests(newOfferSelector, dataNewOldOffer, 0);
            });
          });
        });
      });
    });
  });
})
