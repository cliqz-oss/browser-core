/* global document, window */
import $ from 'jquery';
import Handlebars from 'handlebars';
import { sendMessageToWindow } from './content/data';
import templates from './templates';
import helpers from './helpers';

Handlebars.partials = templates;
Object.keys(helpers).forEach((helperName) => {
  Handlebars.registerHelper(helperName, helpers[helperName]);
});

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), (el) => {
    const elArgs = el.dataset.i18n.split(',');
    const key = elArgs.shift();
    /* eslint-disable */
    el.innerHTML = chrome.i18n.getMessage(key, elArgs);
    /* eslint-enable */
  });
}

function copySelectionText() {
  let copysuccess; // var to check whether execCommand successfully executed
  try {
    copysuccess = document.execCommand('copy'); // run command to copy selected text to clipboard
  } catch (e) {
    copysuccess = false;
  }
  return copysuccess;
}

function selectElementText(e) {
  const range = document.createRange();
  range.selectNodeContents(e);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}


function copy() {
  const codeElem = $('.code')[0];
  selectElementText(codeElem);
  const copysuccess = copySelectionText();
  return copysuccess;
}

// retrieves the current offer id from the document
function cqzOfferGetCurrentOfferID() {
  const offerIDElem = document.getElementById('cqz-browser-panel-re');
  if (!offerIDElem ||
      !offerIDElem.hasAttribute('data-cliqzofferid') ||
      offerIDElem.getAttribute('data-cliqzofferid') === '') {
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
    const success = copy(ev.target);

    if (success) {
      document.querySelector('.code-box').className += ' copied';
    }
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
  $('#cqz-browser-panel-re').on('click', '[data-open-url]', (ev) => {
    sendMessageToWindow({
      handler: 'openUrlHandler',
      data: {
        el_id: ev.target.getAttribute('data-cqz-of-btn-id'),
        url: ev.currentTarget.getAttribute('data-open-url'),
      }
    });
  });

  const conditionsHolder = $('#cqz-browser-panel-re .descr-read-more');
  const conditionsSize = $('.text-holder', conditionsHolder).text().length;

  if (conditionsSize >= 250) {
    conditionsHolder.addClass('size-l');
  }
});

function draw(data) {
  // get the template name to be used and the data of them
  let templateName = data.template_name;
  const templateData = data.template_data;
  if (!templateName || !templateData) {
    return;
  }
  // TODO offers should send labels inside template_data
  const labels = data.labels || {};
  templateData.labels = labels;
  if (Object.keys(templates).indexOf(templateName) === -1) {
    templateName = 'default_template';
  }
  const panel = document.getElementById('cqz-browser-panel-re');
  const html = templates[templateName](templateData);
  panel.innerHTML = html;
  $('img').on('error', function onError() {
    $(this).hide();
  });
  $('.tooltip').tooltipster({
    theme: ['tooltipster-shadow', 'tooltipster-shadow-customized'],
    interactive: true,
    position: ['left']
  });

  localizeDocument();
}

window.draw = draw;
