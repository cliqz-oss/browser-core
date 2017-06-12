/* global window, document */

import $ from 'jquery';
import Handlebars from 'handlebars';
import { sendMessageToWindow } from './data';
import templates from '../templates';

Handlebars.partials = templates;

function resize() {
  const $controlCenter = $('#cliqz-offers-cc');
  const theWidth = $controlCenter.width();
  const theHeight = $controlCenter.height();
  sendMessageToWindow({
    action: 'resize',
    data: {
      width: theWidth,
      height: theHeight
    }
  });
}

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
  let copysuccess = false; // var to check whether execCommand successfully executed
  try {
    copysuccess = document.execCommand('copy'); // run command to copy selected text to clipboard
  } catch (err) {
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
  return copySelectionText();
}

// receive buttons callback
function cqzOfferBtnClicked(ev) {
  // filter if it is button or not

  if (!ev.target || !ev.target.hasAttribute('data-cqz-of-btn-id')) {
    // skip this
    return;
  }

  if (ev.target.getAttribute('data-cqz-of-btn-id') === 'copy-code') {
    const success = copy(ev.target);

    if (success) {
      $(ev.target).parents('.cqz-offer-code-holder').addClass('copied');
    }
  }

  // we will get the data-action field here and will send this to the core
  const data = ev.target.getAttribute('data-cqz-of-btn-id');
  const offerID = ev.target.getAttribute('data-cqz-offer-id');
  // check if the button has specified action type if no assign the default one
  const sigType = ev.target.getAttribute('data-cqz-of-btn-action-type') || 'button_pressed';


  if (data === 'remove-offer') {
    const feedbackElm = $(ev.target).parents('.cqz-remove-feedback').find('input[name=remove_feedback]:checked');
    const offersFeedback = feedbackElm.val() || 'feedback-no';
    // If you don't close the hub we have to reset the choice
    feedbackElm.prop('checked', false);

    sendMessageToWindow({
      action: 'sendTelemetry',
      data: {
        signal_type: 'offer-action-signal',
        element_id: offersFeedback,
        offer_id: offerID,
      }
    });
  }

  sendMessageToWindow({
    action: 'sendTelemetry',
    data: {
      signal_type: sigType,
      element_id: data,
      offer_id: offerID,
    }
  });
}

function draw(data) {
  const newVouchers = data.filter(voucher => voucher.state === 'new');
  const oldVouchers = data.filter(voucher => voucher.state === 'old');

  if (newVouchers.length > 0) {
    document.getElementById('cqz-vouchers-wrapper').classList.add('with-new-vouchers');
    document.getElementById('cqz-new-vouchers-holder').innerHTML = templates.vouchers(newVouchers);
  }

  if (oldVouchers.length > 0) {
    document.getElementById('cqz-vouchers-wrapper').classList.add('with-old-vouchers');
    document.getElementById('cqz-recent-vouchers-holder').innerHTML = templates.vouchers(oldVouchers);
  }

  if (oldVouchers.length === 0 && newVouchers.length === 0) {
    document.getElementById('cqz-vouchers-wrapper').classList.add('no-vouchers');
  }


  localizeDocument();
  resize();
}

// ====== GENERIC SETTING ACCORDION FUNCTIONALITY =========//
$(document).ready(() => {
  // Object.keys(helpers).forEach(function (helperName) {
  //   Handlebars.registerHelper(helperName, helpers[helperName]);
  // });

  sendMessageToWindow({
    action: 'getEmptyFrameAndData',
    data: {}
  });

  // link the click function here to the buttons
  document.getElementById('cliqz-offers-cc').addEventListener('click', cqzOfferBtnClicked);

  $('.cqz-close-hub').on('click', () => {
    sendMessageToWindow({
      action: 'closePanel',
      data: {}
    });
  });

  $('.cqz-show-all-offers').on('click', () => {
    $('#cqz-vouchers-wrapper').addClass('show-all');
    resize();
  });

  let offerID = '';
  let offerElm = $();
  $('body').on('click', (e) => {
    const elm = $(e.target);
    // console.log('+++++ body click');

    if (elm.hasClass('cqz-close')) {
      const offersPosition = $('.cqz-vouchers').scrollTop() || 0;
      offerElm = elm.parents('li');
      offerID = elm.data('cqz-offer-id');
      $('#cliqz-offers-cc').addClass('feedback');
      // Adjust the position of feedback form, when element is scrolled
      $('.cqz-remove-feedback').css('top', offersPosition);

      $('.remove-offer').attr('data-cqz-offer-id', offerID);
      resize();
    }

    if (elm.hasClass('cancel-feedback')) {
      $('#cliqz-offers-cc').removeClass('feedback');
      resize();
    }

    if (elm.hasClass('remove-offer')) {
      $('#cliqz-offers-cc').removeClass('feedback');
      offerElm.css('display', 'none');
      if (offerElm.parents('.cqz-vouchers-inner-holder').find('li:visible').length === 0) {
        // Check do we have collapsed offer when we delete offer. If we then we expand
        if ($('.cqz-show-all-offers:visible').length === 0) {
          document.getElementById('cqz-vouchers-wrapper').classList.add('no-vouchers');
        } else {
          $('.cqz-show-all-offers').click();
        }
      }
      resize();
    }
  });
});


window.draw = draw;

