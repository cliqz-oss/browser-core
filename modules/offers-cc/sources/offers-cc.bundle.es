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

  $('#feedback-comment-wrapper').html(chrome.i18n.getMessage('offers_hub_feedback_thank_you'));

  resize();
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

// Enable/disable text area if user select the 4th option
$(document).on('click', '#voucher-feedback input:radio', function itemClick() {
  if ($(this).attr('id') === 'feedback_option4') {
    $('#feedback_option4_textarea').removeAttr('disabled');
  } else {
    $('#feedback_option4_textarea').attr('disabled', 'disabled');
  }
  // Change the button text to be "Send and close" when any option is selected
  $('#close-feedback').text(chrome.i18n.getMessage('offers_hub_feedback_send_and_close'));
});

// When user send feedback for a specified offer
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

  setTimeout(() => {
    resize();
  }, 200); // TODO: fix this!.
});

// Handle user clicks on offer menu
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
