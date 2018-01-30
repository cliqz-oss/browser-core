/* global document, window */
import $ from 'jquery';
import Handlebars from 'handlebars';
import { sendMessageToWindow } from './content/data';
import templates from './templates';

Handlebars.partials = templates;


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


function copy(e) {
  selectElementText(e);
  const copysuccess = copySelectionText();
  return copysuccess;
}

// retrieves the current offer id from the document
function cqzOfferGetCurrentOfferID() {
  const offerIDElem = document.getElementById('cqz-browser-panel-re');
  if (!offerIDElem ||
      !offerIDElem.hasAttribute('cliqzofferid') ||
      offerIDElem.getAttribute('cliqzofferid') === '') {
    return 'unknown';
  }
  return offerIDElem.getAttribute('cliqzofferid');
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
      document.querySelector('.cqz-offer-code-info').className += ' copied';
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
  $('#cqz-browser-panel-re').on('click', '[openUrl]', (ev) => {
    sendMessageToWindow({
      handler: 'openUrlHandler',
      data: {
        el_id: ev.target.getAttribute('data-cqz-of-btn-id'),
        url: ev.currentTarget.getAttribute('openUrl'),
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
  const templateName = data.template_name;
  const templateData = data.template_data;
  if (!templateName || !templateData) {
    return;
  }
  const panel = document.getElementById('cqz-browser-panel-re');
  const html = templates[templateName](templateData);
  if (panel.unsafeSetInnerHTML) {
    panel.unsafeSetInnerHTML(html);
  } else {
    panel.innerHTML = html;
  }
}

window.draw = draw;

