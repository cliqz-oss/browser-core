import {
  Subject,
} from '../../core/test-helpers-freshtab';
import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import data from './fixtures/full-long-logo';
import config from '../../../core/config';

describe('Promo bar interactions', function () {
  let subject;
  const target = 'cqz-browser-panel-re';
  const promoContainerSelector = '#cqz-browser-panel-re';
  const promoCodeContainerSelector = '.code-container';
  const promoBodySelector = '.promo-container';
  let $promoContainer;
  let $promoCodeContainer;
  let $promoBody;
  let messageCount;
  let msgCount;

  beforeEach(async function () {
    subject = new Subject();
    const path = `/${config.testsBasePath}/browser-panel/index.html`;
    await subject.load({
      buildUrl: path,
      iframeWidth: 1700
    });
    await subject.pushData(target, data, 'render_template');
    $promoContainer = subject.query(promoContainerSelector);
    $promoCodeContainer = $promoContainer.querySelector(promoCodeContainerSelector);
    $promoBody = $promoContainer.querySelector(promoBodySelector);
    messageCount = 0;
  });

  afterEach(function () {
    subject.unload();
  });

  const promoBodyElements = [
    { name: 'flags area', selector: '.special-flags', isClickable: false },
    { name: 'logo', selector: '.logo img', isClickable: true },
    { name: 'benefit value', selector: '.benefit', isClickable: true },
    { name: 'headline', selector: '.headline-container .headline', isClickable: true },
    { name: 'description', selector: '.description .desc-content', isClickable: true },
    { name: 'CTA button', selector: '.call-to-action a.btn', isClickable: true },
    { name: 'tooltip icon', selector: '.call-to-action .info-icon', isClickable: false },
    { name: 'conditions header', selector: '.call-to-action .conditions', isClickable: false },
  ];

  promoBodyElements.forEach(function (element) {
    context(`promo body: clicking on a ${element.name}`, function () {
      const selector = element.selector;
      let $domItem;
      let expectedUrlCount;

      beforeEach(function () {
        $domItem = $promoBody.querySelector(selector);
        $domItem.click();

        if (element.isClickable === false) {
          msgCount = 2;
        } else {
          msgCount = 4;
        }

        return waitFor(function () {
          return subject.messages.length === msgCount;
        });
      });

      it(`does ${(element.isClickable ? '' : 'not')} trigger the openUrl handler`, function () {
        messageCount = subject.messages.filter(msg => msg.message.handler === 'openUrlHandler').length;
        if (element.isClickable) {
          expectedUrlCount = 1;
        } else {
          expectedUrlCount = 0;
        }
        expect(messageCount).to.equal(expectedUrlCount);
      });
    });
  });

  context('promo body: clicking on a ad text', function () {
    const selector = '.call-to-action .conditions';
    let $domItem;
    let expectedUrlCount;

    beforeEach(function () {
      $domItem = subject.query(selector);
      $domItem.click();
      msgCount = 2;

      return waitFor(function () {
        return subject.messages.length === msgCount;
      });
    });

    it('does not trigger the openUrl handler', function () {
      messageCount = subject.messages.filter(msg => msg.message.handler === 'openUrlHandler').length;
      expectedUrlCount = 0;
      expect(messageCount).to.equal(expectedUrlCount);
    });
  });

  const codeContainerElements = [
    { name: 'code', selector: '.code' },
    { name: 'copy link', selector: '.code-copy' }
  ];

  codeContainerElements.forEach(function (el) {
    context(`code container: clicking on a ${el.name}`, function () {
      const elementSelector = el.selector;
      let $element;
      let execCommand;

      beforeEach(function () {
        execCommand = subject.iframe.contentWindow.document.execCommand;
        subject.iframe.contentWindow.document.execCommand = () => true;
        $element = $promoCodeContainer.querySelector(elementSelector);
        $element.click();

        return waitFor(() => subject.messages.length > 2);
      });

      afterEach(function () {
        subject.iframe.contentWindow.document.execCommand = execCommand;
      });


      it('triggers a offersIFrame handler for copying the code', function () {
        messageCount = subject.messages.filter(msg => (
          msg.message.handler === 'offersIFrameHandler'
          && msg.message.action === 'button_pressed'
          && msg.message.data.element_id === 'code_copied'
        )).length;

        expect(messageCount).to.equal(1);
      });

      it('hides the link to copy the code', function () {
        const copyCodeSelector = '.code-copy';
        const $copyCode = $promoCodeContainer.querySelector(copyCodeSelector);

        expect($copyCode).to.exist;
        expect(subject.getComputedStyle($copyCode).display).to.equal('none');
      });

      it('shows the copy confirmation', function () {
        const copiedCodeSelector = '.code-copied';
        const $copiedCode = $promoCodeContainer.querySelector(copiedCodeSelector);

        expect($copiedCode).to.exist;
        expect(subject.getComputedStyle($copiedCode).display).to.not.equal('none');
      });
    });
  });

  context('clicking on a close button', function () {
    const promoCloseBtnSelector = '.close';
    let $promoCloseBtn;

    beforeEach(function () {
      $promoCloseBtn = $promoContainer.querySelector(promoCloseBtnSelector);
      $promoCloseBtn.click();
      msgCount = 3;

      return waitFor(function () {
        return subject.messages.length === msgCount;
      });
    });

    it('triggers a offersIFrame handler for closing an offer', function () {
      messageCount = subject.messages.filter(msg => (
        msg.message.handler === 'offersIFrameHandler'
        && msg.message.action === 'button_pressed'
        && msg.message.data.element_id === 'offer_closed'
      )).length;

      expect(messageCount).to.equal(1);
    });
  });
});
