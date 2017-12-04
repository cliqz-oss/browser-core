/* global window, document */

import $ from 'jquery';
import Handlebars from 'handlebars';
import templates from './templates';

Handlebars.partials = templates;
let lastSeenElements = [];

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


  if (ev.target.getAttribute('data-cqz-of-btn-id') === 'code_copied') {
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


  if (data === 'offer_removed') {
    const feedbackElm = $(ev.target).parents('.cqz-remove-feedback').find('input[name=remove_feedback]:checked');
    const offersFeedback = feedbackElm.val() || 'feedback_no';
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
let scrollTimer;
const shownElements = {};


function scrollFinished() {
  const parent = $('#cqz-vouchers-wrapper');
  const parentTop = parent.offset().top;
  const parentBottom = parent.offset().top + parent.height();

  const currentSeenElements = [];
  $('#cqz-vouchers-wrapper li:visible').each((i, el) => {
    const elmTop = $(el).offset().top;
    const elmBotttom = elmTop + $(el).height();
    const offerId = $(el).data('offer-id');

    if ((elmBotttom <= parentBottom) && (elmTop >= parentTop)) {
      currentSeenElements.push(offerId);
    }
  });

  const difference = currentSeenElements.filter(x => lastSeenElements.indexOf(x) === -1);

  for (let i = 0; i < difference.length; i += 1) {
    const offerId = difference[i];

    if (shownElements[offerId]) {
      shownElements[offerId] += 1;
    } else {
      shownElements[offerId] = 1;
    }
  }
  lastSeenElements = currentSeenElements;

  sendMessageToWindow({
    action: 'seenOffers',
    data: shownElements
  });
}

function bodyScroll() {
  if (scrollTimer) {
    clearTimeout(scrollTimer);
  }

  scrollTimer = window.setTimeout(scrollFinished, 350);
}

// ====== GENERIC SETTING ACCORDION FUNCTIONALITY =========//
$(window).on("load",() => {

  $('#cqz-vouchers-wrapper').scroll(() => {
    bodyScroll();
  });

  bodyScroll();

  sendMessageToWindow({
    action: 'getEmptyFrameAndData',
    data: {}
  });

  // link the click function here to the buttons
  document.getElementById('cliqz-offers-cc').addEventListener('click', cqzOfferBtnClicked);

  // open URL
  $('#cliqz-offers-cc').on('click', '[openUrl]', (ev) => {
    sendMessageToWindow({
      action: 'openURL',
      data: {
        url: ev.currentTarget.getAttribute('openUrl'),
        closePopup: ev.currentTarget.dataset.closepopup || true,
        isCallToAction: ev.currentTarget.dataset.cqzOfBtnId === 'offer_ca_action',
      }
    });
  });

  // Close panel, use offer
  $('#cliqz-offers-cc').on('click', '.cqz-call-to-action .cqz-close-hub', (e) => {
    e.stopPropagation();
  });

  // Remove offer
  $('#cliqz-offers-cc').on('click', '.cqz-ticket-offer .cqz-close', () => {
    sendMessageToWindow({
      action: 'removeOffer',
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

    if (elm.hasClass('cqz-close-hub')) {
      sendMessageToWindow({
        action: 'closePanel',
      });
    }

    if (elm.hasClass('cqz-close')) {
      const offersPosition = $('.cqz-vouchers').scrollTop() || 0;
      offerElm = elm.parents('li');
      offerID = elm.data('cqz-offer-id');
      $('#cliqz-offers-cc').addClass('feedback');
      // Adjust the position of feedback form, when element is scrolled
      $('.cqz-remove-feedback').css('top', offersPosition);

      $('.remove-offer, .cancel-feedback').attr('data-cqz-offer-id', offerID);
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

function sendMessageToWindow(message) {
  postMessage(JSON.stringify({
    target: 'cliqz-offers-cc',
    origin: 'iframe',
    message
  }), '*');
}

function messageHandler(message) {
  switch (message.action) {
    case 'pushData': {
      draw(message.data);
    }
      break;
    default: {
      // nothing to do
    }
  }
}


window.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.target === 'cliqz-offers-cc' &&
     data.origin === 'window') {
    messageHandler(data.message);
  }
});


