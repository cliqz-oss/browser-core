/* global document, Handlebars */

import Basic from './fixtures/basic';
import NoImage from './fixtures/no-image';
import FullNormalLogo from './fixtures/full-normal-logo';
import FullLongLogo from './fixtures/full-long-logo';
import FullShortLogo from './fixtures/full-short-logo';
import FullSquareLogo from './fixtures/full-square-logo';
import HyphenateHeadline from './fixtures/hyphenate-headline';
import HyphenateTitle from './fixtures/hyphenate-title';
import NoDesc from './fixtures/no-desc';
import NoBenefit from './fixtures/no-benefit';
import NoHeadline from './fixtures/no-headline';
import NoConditions from './fixtures/no-conditions';
import NoCallToAction from './fixtures/no-call-to-action';
import NonExistingTemplate from './fixtures/non-existing-template';
/** backwards compatibility with old ticket template */
import TicketV0Full from './fixtures/ticket-template-v0-full';
import TicketV0NoImage from './fixtures/ticket-template-v0-no-image';

import templates from '../templates';

Handlebars.partials = templates;

const tests = {
  ...FullNormalLogo,
  ...FullLongLogo,
  ...FullShortLogo,
  ...FullSquareLogo,
  ...Basic,
  ...HyphenateHeadline,
  ...HyphenateTitle,
  ...NoImage,
  ...NoDesc,
  ...NoBenefit,
  ...NoHeadline,
  ...NoConditions,
  ...NoCallToAction,
  ...NonExistingTemplate,
  ...TicketV0Full,
  ...TicketV0NoImage,
};

const iframeHolder = document.getElementById('iframe-holder');

function render(id, data) {
  const h2 = document.createElement('h2');
  h2.innerText = `Promo bar:  ${id}`;

  const $dynamicIframeElm = document.createElement('iframe');
  const iframeElmId = `cqz-offer-counter-${id}`;
  $dynamicIframeElm.id = iframeElmId;
  $dynamicIframeElm.src = 'index.html';
  iframeHolder.appendChild(h2);
  iframeHolder.appendChild($dynamicIframeElm);

  const iframeElm = document.getElementById(iframeElmId);

  iframeElm.contentWindow.addEventListener('load', () => {
    iframeElm.contentWindow.postMessage(JSON.stringify({
      target: 'cqz-browser-panel-re',
      origin: 'window',
      message: {
        action: 'render_template',
        data
      }
    }), '*');
  });
}


Object.keys(tests).forEach((testName) => {
  const test = tests[testName];
  render(testName, test);
});
