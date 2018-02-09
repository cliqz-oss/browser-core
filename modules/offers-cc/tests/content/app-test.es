function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

let intervals = [];
function registerInterval(interval) {
  intervals.push(interval);
}

function clearIntervals() {
  intervals.forEach(interval => clearInterval(interval));
  intervals = [];
}

function waitFor(fn) {
  var resolver, rejecter, promise = new Promise(function (res, rej) {
    resolver = res;
    rejecter = rej;
  });

  function check() {
    const result = fn();
    if (result) {
      clearInterval(interval);
      resolver(result);
    }
  }

  var interval = setInterval(check, 50);
  check();
  registerInterval(interval);

  return promise;
}

class Subject {
  constructor() {
    this.messages = [];
  }

  load() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/offers-cc/index.html';
    this.iframe.width = 455;
    this.iframe.height = 500;
    document.body.appendChild(this.iframe)

    return new Promise(resolve => {
      this.iframe.contentWindow.addEventListener('load', () => resolve());
    }).then(() => {

      this.iframe.contentWindow.addEventListener('message', ev => {
        var data = JSON.parse(ev.data);
        this.messages.push(data);
      });

      return waitFor(() => {
        return this.messages.length === 1
      })
    });
  }

  unload() {
    document.body.removeChild(this.iframe);
  }

  query(selector) {
    return this.iframe.contentWindow.document.querySelector(selector);
  }

  queryAll(selector) {
    return this.iframe.contentWindow.document.querySelectorAll(selector);
  }

  pushData(data = {}) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cliqz-offers-cc',
      origin: 'window',
      message:  {
        action: 'pushData',
        data,
      }
    }), "*");
    return wait(500);
  }

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
  }
}

describe('Offers Hub App', function() {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function offersHubTests() {
    context('renders offers hub header and footer elements', function () {
      it('renders hub title', function () {
        chai.expect(subject.query('header [data-i18n="offers-hub-title"')).to.exist;
        chai.expect(subject.query('header [data-i18n="offers-hub-title"').textContent.trim()).to.equal('offers-hub-title');
      });

      it('renders close button', function () {
        chai.expect(subject.query('header .cqz-close-hub')).to.exist;
      });

      it('renders "more information"', function () {
        chai.expect(subject.query('footer .cqz-power-by')).to.exist;
        chai.expect(subject.query('footer .cqz-power-by').textContent.trim()).to.equal('offers-hub-about-cliqz-offers');
      });

      it('renders "powered by Cliqz"', function () {
        chai.expect(subject.query('footer .powered-by [data-i18n="offers-hub-powered-by"]')).to.exist;
        chai.expect(subject.query('footer .powered-by [data-i18n="offers-hub-powered-by"]').textContent.trim()).to.equal('offers-hub-powered-by');
      });
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

    describe('click on the code button', function () {
      let execCommand;

      beforeEach(function() {
        execCommand = subject.iframe.contentWindow.document.execCommand
        subject.iframe.contentWindow.document.execCommand = () => true;
        subject.query('.cqz-offer-code').click();
        return waitFor(
          () => subject.messages.find(message => message.message.action === "sendTelemetry")
        ).then(() => {return new Promise(r => setTimeout(r, 500))});
      });

      afterEach(function () {
        subject.iframe.contentWindow.document.execCommand = execCommand;
      });

      it('"code copied" appeared', function () {
        chai.expect(subject.query('.cqz-offer-code-holder.copied')).to.exist;
        chai.expect(subject.query('.cqz-offer-code-info')).to.exist;
        chai.expect(subject.query('.cqz-offer-code-info').textContent.trim()).to.equal('offers-hub-code-copy');
        chai.expect(subject.getComputedStyle('.cqz-offer-code-holder.copied .cqz-offer-code-info').opacity).to.equal('1');
      });
    });
  };

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

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('empty offers hub', function () {
    beforeEach(() => {
      return subject.pushData();
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
    beforeEach(() => {
      return subject.pushData([]);
    });

    offersHubTests();
    noOffersMessageTests();
  });

  describe('one new offer', function () {
    const data = [
      {
        'state':'new',
        'template_name':'ticket_template',
        'template_data':
          {
            'call_to_action':
              {
                'target':'',
                'text':'Zum Angebot',
                'url':'https://www.foodora.de',
              },
            'code':'CLIQZOFFERS',
            'conditions':'Mindestbestellwert beträgt 15 Euro.',
            'desc':'description is here',
            'logo_url':'https://s3.amazonaws.com/cdn.cliqz.com/extension/offers/foodoraLogo.png',
            'title':'3€ Rabatt für deine Bestellung bei Foodora',
            'voucher_classes':'',
          },
        'offer_id':'FOODORA_TEST_1',
      }
    ];
    const newOfferSelector = '#cqz-new-vouchers-holder';
    beforeEach(() => {
      return subject.pushData(data);
    });

    offersHubTests();

    context('screen with the offer', function () {
      offerTests(newOfferSelector, data, 0);
    });

    describe('click on "close offer" button', function () {
      clickButtonAndWait('.cqz-close');

      feedbackWindowTests();

      describe('click on remove button', function () {
        clickButtonAndWait('.cqz-remove-feedback .remove-offer.button');

        context('renders "no offers" message', function () {
          noOffersMessageTests();
        });
      });

      describe('click on cancel button', function () {
        clickButtonAndWait('.cqz-remove-feedback .cancel-feedback.button');

        context('renders offer', function () {
          offerTests(newOfferSelector, data, 0);
        });
      });
    });
  });

  describe('one old offer', function () {
    const data = [
      {
        'state':'old',
        'template_name':'ticket_template',
        'template_data':
          {
            'call_to_action':
              {
                'target':'',
                'text':'Zum Angebot',
                'url':'https://www.foodora.de',
              },
            'code':'CLIQZOFFERS',
            'conditions':'Mindestbestellwert beträgt 15 Euro.',
            'desc':'description is here',
            'logo_url':'https://s3.amazonaws.com/cdn.cliqz.com/extension/offers/foodoraLogo.png',
            'title':'3€ Rabatt für deine Bestellung bei Foodora',
            'voucher_classes':'',
          },
        'offer_id':'FOODORA_TEST_1',
      }
    ];
    const recentOfferSelector = '#cqz-recent-vouchers-holder';
    beforeEach(() => {
      return subject.pushData(data);
    });

    offersHubTests();

    context('screen with the offer', function () {
      offerTests(recentOfferSelector, data, 0);
    });

    describe('click on "close offer" button', function () {
      clickButtonAndWait('.cqz-close');

      feedbackWindowTests();

      describe('click on remove button', function () {
        clickButtonAndWait('.cqz-remove-feedback .remove-offer.button');

        context('renders "no offers" message', function () {
          noOffersMessageTests();
        });
      });

      describe('click on cancel button', function () {
        clickButtonAndWait('.cqz-remove-feedback .cancel-feedback.button');

        context('renders offer', function () {
          offerTests(recentOfferSelector, data, 0);
        });
      });
    });
  });

  describe('new offer and old offer', function () {
    const data = [
      {
        'state':'new',
        'template_name':'ticket_template',
        'template_data':
          {
            'call_to_action':
              {
                'target':'',
                'text':'Zum Angebot',
                'url':'https://www.foodora.de',
              },
            'code':'CLIQZOFFERS',
            'conditions':'Mindestbestellwert beträgt 15 Euro.',
            'desc':'Test description here',
            'logo_url':'https://s3.amazonaws.com/cdn.cliqz.com/extension/offers/foodoraLogo.png',
            'title':'3€ Rabatt für deine Bestellung bei Foodora',
            'voucher_classes':'',
          },
        'offer_id':'FOODORA_TEST_1',
      },
      {
        'state':'old',
        'template_name':'ticket_template',
        'template_data':
          {
            'call_to_action':
              {
                'target':'',
                'text':'Gutschein anzeigen',
                'url':'http://newurl',
              },
            'code':'CLIQZTEST',
            'conditions':'conditions here',
            'desc':'CHIP OFFER',
            'logo_url':'http://p5.focus.de/fol/pics/fol/fol_logo_ohne_outline.svg',
            'title':'CHIP OFFER TEST TITLE',
            'voucher_classes':'',
          },
        'offer_id':'test-ticket-template-o3',
      }
    ];
    const newOfferSelector = '#cqz-new-vouchers-holder';
    const recentOfferSelector = '#cqz-recent-vouchers-holder';

    beforeEach(() => {
      return subject.pushData(data);
    });

    describe('before clicking on button "Show all offers"', function () {
      context('renders new offer', function () {
        const newOfferSelector = '#cqz-new-vouchers-holder';
        offerTests(newOfferSelector, data, 0);
      });

      it('renders button "Show all offers"', function () {
        chai.expect(subject.query('.cqz-show-all-offers')).to.exist;
        chai.expect(subject.query('.cqz-show-all-offers').textContent.trim()).to.equal('offers-hub-show-all-offers-btn');
      });

      it('recent offer hidden', function () {
        chai.expect(subject.query('#cqz-recent-vouchers-holder')).to.exist;
        chai.expect(subject.getComputedStyle('#cqz-recent-vouchers-holder').display).to.equal('none');
      });

      describe('click on "close" button for new offer', function () {
        const buttonSelector = '#cqz-new-vouchers-holder .cqz-close';
        clickButtonAndWait(buttonSelector);

        feedbackWindowTests();

        describe('click on remove button', function () {
          clickButtonAndWait('.cqz-remove-feedback .remove-offer.button');

          context('renders recent offer', function () {
            offerTests(recentOfferSelector, data, 1);
          });
        });

        describe('click on cancel button', function () {
          clickButtonAndWait('.cqz-remove-feedback .cancel-feedback.button');

          context('renders new offer', function () {
            offerTests(newOfferSelector, data, 0);
          });
        });
      });
    });

    describe('after clicking on button "Show all offers"', function() {
      clickButtonAndWait('.cqz-show-all-offers');

      context('renders new offer', function () {
        offerTests(newOfferSelector, data, 0);
      });

      context('renders old offer', function () {
        offerTests(recentOfferSelector, data, 1);
      });

      describe('close first offer', function () {
        describe('click on "close" button for new offer', function () {
          const buttonSelector = '#cqz-new-vouchers-holder .cqz-close';
          clickButtonAndWait(buttonSelector);

          feedbackWindowTests();

          describe('click on remove button', function () {
            clickButtonAndWait('.cqz-remove-feedback .remove-offer.button');

            context('renders recent offer', function () {
              offerTests(recentOfferSelector, data, 1);
            });
          });

          describe('click on cancel button', function () {
            clickButtonAndWait('.cqz-remove-feedback .cancel-feedback.button');

            context('renders new offer', function () {
              offerTests(newOfferSelector, data, 0);
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
              offerTests(recentOfferSelector, data, 1);
            });
          });

          describe('click on cancel button', function () {
            clickButtonAndWait('.cqz-remove-feedback .cancel-feedback.button');

            context('renders new offer', function () {
              offerTests(newOfferSelector, data, 0);
            });
          });
        });
      });
    });
  });
})
