/* global window, document, $, Handlebars */

import helpers from './content/helpers';
import templates from './templates';

Handlebars.partials = templates;

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

function draw(data) {
  $('#cliqz-offers-cc').html(templates.template(data));

  if ($('#cqz-vouchers-holder').length) {
    // Check if there is an expanded offer and report
    const activeOffer = $('ul#cqz-vouchers-holder > li.active');
    if (activeOffer.length) {
      const offerId = activeOffer.data('offerId');
      sendMessageToWindow({
        action: 'seenOffer',
        data: {
          offer_id: offerId,
        }
      });
    }
  }

  $('.condition').tooltipster({
    theme: ['tooltipster-shadow', 'tooltipster-shadow-customized'],
    interactive: true,
    delay: 150,
    animationDuration: 150,
    side: 'top',
    functionPosition: (instance, helper, position) => {
      const newPos = position;
      newPos.coord.top += 4; // Add some pixels on the top
      newPos.coord.left += 14; // Add some pixels on the left
      newPos.size.width -= 26; // Reduce the tooltip's width
      return newPos;
    },
    functionBefore: () => {
      sendMessageToWindow({
        action: 'sendTelemetry',
        data: {
          action: 'hover',
          target: 'conditions'
        }
      });
    }
  });


  localizeDocument();
  resize();
}

// Check if feedback field's have value to enable send Btn
function enableSendFeedbackBtn() {
  if ($('#feedback_option1').is(':checked') ||
      $('#feedback_option2').is(':checked') ||
      $('#feedback_option3').is(':checked')
  ) {
    $('.send_feedback').addClass('active');
    $('#feedback_option4_textarea').val('');
  }
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

// Handle give feedback close btn
$(document).on('click', '.feedback-box .close', () => {
  $('.overlay').removeClass('show');
  $('.setting').removeClass('opacity-up');
  if ($('#cqz-vouchers-wrapper .cqz-no-vouchers-msg')) {
    $('.cqz-no-vouchers-msg').height('inherit');
    resize();
  }
});

// Handle clicking on menu item - Feedback
$(document).on('click', '.setting-menu .feedback', function itemClick() {
  $('.overlay').addClass('show');
  $('.setting-menu').removeClass('show');
  const currentVoucher = $(this).closest('.page-container');
  currentVoucher.children('.overlay').html(templates['give-feedback']({}));
  localizeDocument();

  if ($('#cqz-vouchers-wrapper .cqz-no-vouchers-msg')) {
    $('.cqz-no-vouchers-msg').height('300px');
    resize();
  }
});

// Handle Reward box Menu Open
$(document).on('click', '.setting', () => {
  $('.setting-menu').toggleClass('show');
  $('.setting').toggleClass('opacity-up');
});

// Close menu when menu items selected
$(document).on('click', '.setting-menu li', () => {
  $('.setting-menu').removeClass('show');
  $('.setting').removeClass('opacity-up');
});

// Check when user blur out of textarea to enable or disable submit Btn
$(document).on('blur', '#feedback_option4_textarea', function itemClick() {
  if ($(this).val().trim() === '') {
    $('.send_feedback').removeClass('active');
  }
});

// Check if user enter spaces in the textarea to enable or disable submit Btn
$(document).on('keyup', '#feedback_option4_textarea', function itemClick() {
  if ($(this).val().trim() === '') {
    $('.send_feedback').removeClass('active');
  } else {
    $('.send_feedback').addClass('active');
  }
});

// Check textarea on focus if emtpy to disable submit Btn
$(document).on('focus', '#feedback_option4_textarea', function itemClick() {
  if ($(this).val().trim() === '') {
    $('.send_feedback').removeClass('active');
  }
});

// When user click on a collapsed offer to expand it
$(document).on('click', 'ul#cqz-vouchers-holder > li:not(.active)', function itemClick() {
  $('ul#cqz-vouchers-holder > li.active').removeClass('active');
  $('ul#cqz-vouchers-holder > li.deleted').remove();
  $(this).addClass('active');

  const offerId = $(this).data('offerId');

  sendMessageToWindow({
    action: 'sendOfferActionSignal',
    data: {
      signal_type: 'offer-action-signal',
      element_id: 'offer_expanded',
      offer_id: offerId,
    }
  });

  sendMessageToWindow({
    action: 'seenOffer',
    data: {
      offer_id: offerId,
    }
  });

  sendMessageToWindow({
    action: 'sendTelemetry',
    data: {
      target: 'expand',
    }
  });

  setTimeout(() => {
    resize();
  }, 200); // TODO: fix this!.
});

// When user clicks on any element which has data-telemetry-id
$(document).on('click', '[data-telemetry-id]', function itemClick() {
  const target = $(this).data('telemetryId');
  // don't send telemetry  if the menu is already
  if (target === 'menu' && !$('.setting').hasClass('opacity-up')) {
    return;
  }

  sendMessageToWindow({
    action: 'sendTelemetry',
    data: {
      target,
    }
  });
});

// When user clicks on the about link
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

// When user clicks to expand the feedback area for all offers
$(document).on('click', '#feedback-button', function itemClick() {
  $('#feedback-content').toggleClass('active');
  $(this).toggleClass('expand');

  resize();
});

let vote;
// When user clicks on thumb up/down button
$(document).on('click', '.feedback-button', function itemClick() {
  vote = $(this).data('vote');
  $(this).addClass('selected').siblings('.feedback-button')
    .removeClass('selected');
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
});

// When user sends a feedback for all offers
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

  $('.overlay').html(templates['give-feedback-thankyou']({}));
  localizeDocument();
});

// When user clicks on the expand button to see all offers
$(document).on('click', '#expand-button', function itemClick() {
  $('.voucher-wrapper.preferred').removeClass('preferred');
  $(this).css('visibility', 'hidden');
  sendMessageToWindow({
    action: 'sendActionSignal',
    data: {
      actionId: 'show_more_offers',
    }
  });

  resize();
});

// When user clicks to copy the promotion code
$(document).on('click', '.promocode-wrapper', function itemClick() {
  const offerId = getOfferId($(this));
  $(this).find('.code').focus().select();
  const success = copySelectionText();

  if (success) {
    $(this).find('.copy-code').text(chrome.i18n.getMessage('offers_hub_code_copy'));
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

// When user clicks on the offer's menu
$(document).on('click', '.setting', function itemClick(e) {
  e.stopPropagation();
  $(this).closest('.logo-wrapper').toggleClass('menu-opened');
});

// When use clicks on "Call to action" button
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

// When use clicks on "Call to action" elements
$(document).on('click', '.cta-element', function itemClick() {
  const currentVoucher = $(this).closest('.voucher-wrapper');
  if (currentVoucher && !currentVoucher.hasClass('active')) {
    return; // Don't open url if this offer is collapsed
  }

  sendMessageToWindow({
    action: 'openURL',
    data: {
      url: $(this).data('url'),
      elemId: $(this).data('elem'),
      closePopup: true,
      isCallToAction: true,
      offerId: getOfferId($(this))
    }
  });
});

// Enable/disable text area if user select the 4th option
$(document).on('click', '#voucher-feedback input:radio', function itemClick() {
  if ($(this).attr('id') === 'feedback_option1' ||
      $(this).attr('id') === 'feedback_option2' ||
      $(this).attr('id') === 'feedback_option3'
  ) {
    $('#feedback_option4_textarea').attr('disabled', 'disabled');
    enableSendFeedbackBtn();
  }

  // Change the button text to be "Send and close" when any option is selected
  $('#close-feedback').text(chrome.i18n.getMessage('offers_hub_feedback_send_and_close'));
});

$(document).on('click', '.textarea-holder div', () => {
  $('#feedback_option4_textarea').removeAttr('disabled');
  $('#feedback_option4_textarea').focus();
  $('#voucher-feedback input:radio').prop('checked', false);
  enableSendFeedbackBtn();
});

function sendFeedback() {
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
}

function closeFeedbackScreen(elem) {
  elem.closest('.voucher-wrapper').remove();
  // Redraw the popup if there is no voucher left
  if (!$('ul#cqz-vouchers-holder > li').length) {
    sendMessageToWindow({
      action: 'getEmptyFrameAndData',
      data: {}
    });
  }
  setTimeout(() => {
    resize();
  }, 200); // TODO: fix this!.
}

/* eslint-disable */
$(document).on('click', '.feedback-thankyou .close', function itemClick() {
  closeFeedbackScreen($(this));
});
/* eslint-enable */

// When user send feedback for a specified offer
$(document).on('click', '.feedback-box .close-offer', function itemClick() {
  sendFeedback();
  sendMessageToWindow({
    action: 'sendOfferActionSignal',
    data: {
      signal_type: 'remove-offer',
      element_id: 'offer_removed',
      offer_id: getOfferId($(this)),
    }
  });
  closeFeedbackScreen($(this));
});

// Handle Send Feedback
$(document).on('click', '.send_feedback', function itemClick() {
  // Check one of the Feedback options is not empty

  $('.feedback').removeClass('show');
  const currentVoucher = $(this).closest('.voucher-wrapper');

  sendFeedback();
  sendMessageToWindow({
    action: 'sendOfferActionSignal',
    data: {
      signal_type: 'remove-offer',
      element_id: 'offer_removed',
      offer_id: getOfferId($(this)),
    }
  });

  currentVoucher.html(templates['feedback-voucher-thankyou']({}));
  localizeDocument();
  resize();
});


// When user click on why i see this
$(document).on('click', '.why', () => {
  const detailsClass = $('.details');
  detailsClass.children('.why-offers').html(templates['why-offers']({}));
  detailsClass.children('.why-offers').addClass('show');
  detailsClass.children('.voucher-container').addClass('hide');

  // No voucher handling
  $('.cqz-no-vouchers-msg').addClass('hide');

  // close feedback pop up if opened
  $('.overlay').removeClass('show');
  $('.setting').removeClass('opacity-up');

  // close feedback for delete offer pop up
  $('.feedback').removeClass('show');

  resize();
  localizeDocument();
});

// When user close why do i see this
$(document).on('click', '.why-offers .close', () => {
  const detailsClass = $('.details');
  detailsClass.children('.why-offers').removeClass('show');
  detailsClass.children('.voucher-container').removeClass('hide');
  // No voucher handling
  $('.cqz-no-vouchers-msg').removeClass('hide');
  resize();
});

// Handle UNDO remove offer
$(document).on('click', '.undo', () => {
  $('.feedback').removeClass('show');
  $('.voucher-container').removeClass('hide');
  resize();
});

// Handle user clicks on offer menu
$(document).on('click', '.voucher-header .close', function itemClick() {
  if ($(this).data('menuType') === 'delete') {
    $(this).closest('.settings')
      .prev().children('.setting')
      .hide();
    const currentVoucher = $(this).closest('.voucher-wrapper');

    currentVoucher.addClass('deleted');
    currentVoucher.children('.details').children('.feedback').html(templates['feedback-voucher']({})); // empty data
    localizeDocument();
    currentVoucher.children('.details').children('.feedback').addClass('show');
    currentVoucher.children('.details').children('.voucher-container').addClass('hide');
    resize();
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
// Close offer menu when user clicks anywhere outside
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
