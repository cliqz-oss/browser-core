/* global window, document, $, Handlebars */

import helpers from './content/helpers';
import templates from './templates';

Handlebars.partials = templates;
let lastSeenElements = [];

function sendMessageToWindow(message) {
  postMessage(JSON.stringify({
    target: 'cliqz-offers-cc',
    origin: 'iframe',
    message
  }), '*');
}

function resize() {
  const $controlCenter = $('#cqz-offer-cc-content');
  const theWidth = $controlCenter.outerWidth(); // Includes the scroll bar
  const theHeight = $controlCenter.outerHeight();
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

function getOfferId(element) {
  return element.closest('.voucher-wrapper').data('offerId');
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

let scrollTimer;
const shownElements = {};

function scrollFinished() {
  const parent = $('#cqz-vouchers-holder');
  // To not have exception in console where there is no offer left
  if (!parent.length) {
    return;
  }

  const parentTop = parent.offset().top;
  const parentBottom = parent.offset().top + parent.height();

  const currentSeenElements = [];
  $('#cqz-vouchers-holder > li:visible').each((i, el) => {
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
    action: 'seenOffers', // TODO: Do we need seenOffers ?
    data: shownElements
  });
}

function bodyScroll() { // TODO: Still need this ?
  if (scrollTimer) {
    clearTimeout(scrollTimer);
  }

  scrollTimer = window.setTimeout(scrollFinished, 350);
}

function draw(data) {
  $('#cliqz-offers-cc').html(templates.template(data));

  if ($('#cqz-vouchers-holder').length) {
    bodyScroll();
    $('#cqz-vouchers-holder').scroll(() => {
      bodyScroll();
    });

    // TODO: apply this fix only in case the first rendering fails
    // localizeDocument();
    // setTimeout(() => {
    //   resize();
    // }, 200); // TODO: fix this!.
    // return;
  }

  $('.tooltip').tooltipster({
    theme: ['tooltipster-shadow', 'tooltipster-shadow-customized'],
    interactive: true,
    delay: 150,
    animationDuration: 150,
    position: ['left']
  });


  localizeDocument();
  resize();
}

// ====== ON LOAD ======//
$(() => {
  Object.keys(helpers).forEach((helperName) => {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  sendMessageToWindow({
    action: 'getEmptyFrameAndData',
    data: {}
  });
});

$(document).on('click', 'ul#cqz-vouchers-holder > li:not(.active)', function itemClick() {
  $('ul#cqz-vouchers-holder > li.active').removeClass('active');
  $('ul#cqz-vouchers-holder > li.deleted').remove();
  $(this).addClass('active');

  sendMessageToWindow({
    action: 'sendOfferActionSignal',
    data: {
      signal_type: 'offer-action-signal',
      element_id: 'offer_expanded',
      offer_id: $(this).data('offerId'),
    }
  });

  setTimeout(() => {
    resize();
  }, 200); // TODO: fix this!.
});

$(document).on('click', '[data-telemetry-id]', function itemClick() {
  const target = $(this).data('telemetryId');
  sendMessageToWindow({
    action: 'sendTelemetry',
    data: {
      target,
    }
  });
});

$(document).on('click', '#about-link', function itemClick() {
  sendMessageToWindow({
    action: 'sendActionSignal',
    data: {
      actionId: 'more_about_cliqz',
    }
  });

  sendMessageToWindow({
    action: 'sendTelemetry',
    data: {
      target: 'learn_more'
    }
  });

  sendMessageToWindow({
    action: 'openURL',
    data: {
      url: $(this).data('url'),
      closePopup: true,
      isCallToAction: false,
    }
  });
});

$(document).on('click', '#feedback-button', function itemClick() {
  $('#feedback-content').toggleClass('active');
  $(this).toggleClass('expand');

  resize();
});

let vote;
$(document).on('click', '.feedback-button', function itemClick() {
  vote = $(this).data('vote');
  sendMessageToWindow({
    action: 'sendUserFeedback',
    data: {
      target: 'myoffrz',
      vote,
      comments: '',
    }
  });
  sendMessageToWindow({
    action: 'sendTelemetry',
    data: {
      target: 'myoffrz',
      vote,
      comments: '',
    }
  });
  $('#feedback-vote-wrapper').hide();
  $('#feedback-comment-wrapper').show();
  resize();
});

$(document).on('click', '#submit-feedback', () => {
  const comments = $('#feedback-textarea').val();
  if (comments.trim().length) {
    sendMessageToWindow({
      action: 'sendUserFeedback',
      data: {
        target: 'myoffrz',
        vote,
        comments,
      }
    });

    sendMessageToWindow({
      action: 'sendTelemetry',
      data: {
        target: 'myoffrz',
        vote,
        comments,
      }
    });
  }

  $('#feedback-comment-wrapper').html(chrome.i18n.getMessage('offers-hub-feedback-thank-you'));

  resize();
});

$(document).on('click', '#expand-button', function itemClick() {
  $('.voucher-wrapper.preferred').removeClass('preferred');
  $(this).css('visibility', 'hidden');
  sendMessageToWindow({
    action: 'sendActionSignal',
    data: {
      actionId: 'show_more_offers',
    }
  });
  bodyScroll();

  resize();
});

$(document).on('click', '.promocode-wrapper', function itemClick() {
  const offerId = getOfferId($(this));
  $(this).find('.code').focus().select();
  const success = copySelectionText();

  if (success) {
    $(this).find('.copy-code').text(chrome.i18n.getMessage('offers-hub-code-copy'));
    // $(this).find('.code').blur(); // Should we blur it ?
    sendMessageToWindow({
      action: 'sendOfferActionSignal',
      data: {
        signal_type: 'offer-action-signal',
        element_id: 'code_copied',
        offer_id: offerId,
      }
    });
  }
});

$(document).on('click', '.setting', function itemClick(e) {
  e.stopPropagation();
  $(this).closest('.logo-wrapper').toggleClass('menu-opened');
});

$(document).on('click', '.cta-btn', function itemClick() {
  sendMessageToWindow({
    action: 'openURL',
    data: {
      url: $(this).data('url'),
      closePopup: true,
      isCallToAction: true,
      offerId: getOfferId($(this)),
    }
  });
});

$(document).on('click', '.cta-element', function itemClick() {
  sendMessageToWindow({
    action: 'openURL',
    data: {
      url: $(this).data('url'),
      closePopup: true,
      isCallToAction: true,
      offerId: getOfferId($(this))
    }
  });
});

$(document).on('click', '#voucher-feedback input:radio', function itemClick() {
  if ($(this).attr('id') === 'feedback_option4') {
    $('#feedback_option4_textarea').removeAttr('disabled');
  } else {
    $('#feedback_option4_textarea').attr('disabled', 'disabled');
  }

  $('#close-feedback').text(chrome.i18n.getMessage('offers-hub-feedback-send-and-close'));
});

$(document).on('click', '#close-feedback', function itemClick() {
  $('#expand-button').css('visibility', 'hidden');
  const feedbackValue = $('input[name="remove_feedback"]:checked').val() || 'none';
  const comments = feedbackValue === 'other' ? $('#feedback_option4_textarea').val() : '';
  sendMessageToWindow({
    action: 'sendUserFeedback',
    data: {
      target: 'remove_offer',
      vote: feedbackValue,
      comments,
      offer_id: getOfferId($(this)),
    }
  });

  sendMessageToWindow({
    action: 'sendTelemetry',
    data: {
      target: 'remove_offer',
      vote: feedbackValue,
      comments,
    }
  });

  const currentVoucher = $(this).closest('.voucher-wrapper');
  currentVoucher.remove();
  // Redraw the popup if there is no voucher left
  if (!$('ul#cqz-vouchers-holder > li').length) {
    sendMessageToWindow({
      action: 'getEmptyFrameAndData',
      data: {}
    });
  }
  bodyScroll();

  setTimeout(() => {
    resize();
  }, 200); // TODO: fix this!.
});

$(document).on('click', 'ul.settings > li', function itemClick() {
  if ($(this).data('menuType') === 'delete') {
    $(this).closest('.settings')
      .prev().children('.setting')
      .hide();
    const currentVoucher = $(this).closest('.voucher-wrapper');

    currentVoucher.addClass('deleted');
    currentVoucher.children('.details').html(templates['feedback-voucher']({})); // empty data
    localizeDocument();
    resize();

    sendMessageToWindow({
      action: 'sendOfferActionSignal',
      data: {
        signal_type: 'remove-offer',
        element_id: 'offer_removed',
        offer_id: getOfferId($(this)),
      }
    });
  }
});

// Hide the tooltip if it is being clicked
$(document).on('click', '.tooltip', () => {
  sendMessageToWindow({
    action: 'getEmptyFrameAndData',
    data: {
      hideTooltip: true,
    }
  });
});

$(document).on('click', '#cliqz-offers-cc', () => {
  $('.logo-wrapper.menu-opened').removeClass('menu-opened');
});

function messageHandler(message) {
  switch (message.action) {
    case 'pushData':
      draw(message.data);
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

// TODO: Create a function named hideTooltipAndMenu() and put the code.
// Triggering: when clicking on body or any element or pressing ESC button
