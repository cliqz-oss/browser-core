/* global $, Handlebars */

import { chrome } from '../platform/content/globals';
import { sendMessageToWindow, getImageAsDataurl } from './content/data';
import templates from './templates';
import helpers from './helpers';
import logger from './logger';

const BRANDS = {
  myoffrz: {
    learn_more_url: 'https://myoffrz.com/fuer-nutzer/'
  },
  chip: {
    learn_more_url: 'https://sparalarm.chip.de/fuer-nutzer/'
  },
  cliqz: {
    learn_more_url: 'https://cliqz.com/myoffrz'
  }
};

function brandAssets(brand) {
  return BRANDS[brand] || BRANDS.myoffrz;
}

Handlebars.partials = templates;
Object.keys(helpers).forEach((helperName) => {
  Handlebars.registerHelper(helperName, helpers[helperName]);
});

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), (el) => {
    const elArgs = el.dataset.i18n.split(',');
    const key = elArgs.shift();
    // eslint-disable-next-line no-param-reassign
    el.innerHTML = chrome.i18n.getMessage(key, elArgs);
  });
}

// retrieves the current offer id from the document
function cqzOfferGetCurrentOfferID() {
  const offerIDElem = document.getElementById('cqz-browser-panel-re');
  if (!offerIDElem
      || !offerIDElem.hasAttribute('data-cliqzofferid')
      || offerIDElem.getAttribute('data-cliqzofferid') === '') {
    return 'unknown';
  }
  return offerIDElem.getAttribute('data-cliqzofferid');
}

// receive buttons callback
function cqzOfferBtnClicked(ev) {
  // filter if it is button or not
  if (!ev.target || !ev.target.hasAttribute('data-cqz-of-btn-id')) {
    // skip this
    return;
  }

  if (ev.target.getAttribute('data-cqz-of-btn-id') === 'code_copied') {
    const hiddenInput = $(ev.target).parent().find('.hidden-code-value')[0];
    if (hiddenInput) {
      hiddenInput.select();
      document.execCommand('copy');
    }
    document.querySelector('.code-box').className += ' copied';
  }

  // we will get the data-action field here and will send this to the core
  const data = ev.target.getAttribute('data-cqz-of-btn-id');
  const offerID = cqzOfferGetCurrentOfferID();
  sendMessageToWindow({
    action: 'button_pressed',
    handler: 'offersIFrameHandler',
    data: {
      signal_type: 'button_pressed',
      element_id: data,
      offer_id: offerID,
    }
  });
}


$(document).ready(() => {
  // on load we ask the browser window for data
  sendMessageToWindow({
    handler: 'offersIFrameHandler',
    action: 'get_last_data',
    data: {}
  });

  // link the click function here to the buttons
  document.getElementById('cqz-browser-panel-re').addEventListener('click', cqzOfferBtnClicked);

  // open URL
  $('#cqz-browser-panel-re').on('click', '[data-openUrl]', (ev) => {
    sendMessageToWindow({
      handler: 'openUrlHandler',
      data: {
        url: ev.currentTarget.getAttribute('data-openUrl'),
      }
    });
  });

  const conditionsHolder = $('#cqz-browser-panel-re .descr-read-more');
  const conditionsSize = $('.text-holder', conditionsHolder).text().length;

  if (conditionsSize >= 250) {
    conditionsHolder.addClass('size-l');
  }
});

function createImageUpdater(props) {
  /**
   * when the `src` attribute of this HTMLImageElement is not defined
   * attempt to retrieve the image content as `data:` url
   * from the prop in `props` keyed by its `data-url-prop` attribute if any.
   * then if successful set its `src` attribute accordingly and display it.
   *
   * @this {HTMLImageElement}
   * @return {Promise<void>} always resolves after all side-effects,
   * even on failure to retrieve the image content, never rejects
   */
  async function updateImageWithDataurl() {
    const img = $(this);
    if (img.attr('src')) {
      return;
    }
    const url = props[img.data('url-prop')];
    if (!url) {
      return;
    }
    const dataurl = await getImageAsDataurl(url);
    if (!dataurl) {
      logger.warn('browser-panel: dataurl void for ', url);
      return;
    }
    img.attr('src', dataurl);
    img.show();
  }

  return updateImageWithDataurl;
}

/**
 * warning: although this function returns immediately,
 * it initiates an async side-effect that attempts to retrieve and inject the logo image
 * when defined by the `logo_url` string property of the given `template_data` object.
 *
 * @param {{ template_name: string, template_data: object }} data
 * @return {void}
 */
function draw(data) {
  // get the template name to be used and the data of them
  let templateName = data.template_name;
  const templateData = data.template_data;
  if (!templateName || !templateData) {
    return;
  }
  if (Object.keys(templates).indexOf(templateName) === -1) {
    templateName = 'default_template';
  }

  $('html').addClass(`${data.brand || 'myoffrz'}-brand`);
  templateData.brand = brandAssets(data.brand);

  // EX-6655: Specify lang for sake of hyphenation - only German offers for now
  // TODO: Get offer language from portal once they start supporting languages
  // const docElem = document.documentElement;
  // docElem.setAttribute('lang', data.lang);

  const panel = document.getElementById('cqz-browser-panel-re');
  panel.innerHTML = templates[templateName](templateData);

  const img = $('img');
  img.on('error', function onError() {
    $(this).hide();
  });

  $('.tooltip').tooltipster({
    theme: ['tooltipster-shadow', 'tooltipster-shadow-customized'],
    interactive: true,
    delay: 400,
    animationDuration: 150,
    position: ['left']
  });

  localizeDocument();

  sendMessageToWindow({
    handler: 'show',
    data: { height: 115 }, // should be static, see plz offers-banner/sites-specific.js
  });

  const updateImageWithDataurl = createImageUpdater(templateData);
  img.each(updateImageWithDataurl);
}

window.draw = draw;
