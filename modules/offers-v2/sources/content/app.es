import { messageHandler, sendMessageToWindow } from 'offers-v2/content/data';
import $ from 'jquery';
import Handlebars from 'handlebars';
import templates from 'offers-v2/templates';

Handlebars.partials = templates;


// retrieves the current offer id from the document
function cqzOfferGetCurrentOfferID() {
  const offerIDElem = document.getElementById('cliqz-offers');
  if (!offerIDElem || offerIDElem.cliqzofferid === '') {
    return 'unknown';
  }
  return offerIDElem.cliqzofferid;
}

// receive buttons callback
function cqzOfferBtnClicked(ev) {
  // filter if it is button or not

  if (!ev.target || !ev.target.hasAttribute("data-cqz-of-btn-id")) {
    // skip this
    return;
  }

  if(ev.target.getAttribute("data-cqz-of-btn-id") === "copy-code") {
    var success = copy(ev.target);

    if (success) {
      document.querySelector('.cqz-offer-code-info').className += " copied";
    }

  }

  // we will get the data-action field here and will send this to the core
  const data = ev.target.getAttribute("data-cqz-of-btn-id");
  const offerID = cqzOfferGetCurrentOfferID();
  sendMessageToWindow({
    action: 'button_pressed',
    data: {
      signal_type: 'button_pressed',
      element_id: data,
      offer_id: offerID,
    }
  });
}


$(document).ready(function(resolvedPromises) {
  // on load we ask the browser window for data
  sendMessageToWindow({
    action: 'get_last_data',
    data: {}
  });

  // link the click function here to the buttons
  document.getElementById('cliqz-offers').addEventListener('click', cqzOfferBtnClicked);
});

function draw(data) {
  // get the template name to be used and the data of them
  var templateName = data.template_name;
  var templateData = data.template_data;
  if (!templateName || !templateData) {
    return;
  }
  document.getElementById('cliqz-offers').innerHTML = templates[templateName](templateData)
}

function selectElementText(e) {
    var range = document.createRange();
    range.selectNodeContents(e);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

function copySelectionText() {
  var copysuccess // var to check whether execCommand successfully executed
  try {
    copysuccess = document.execCommand("copy") // run command to copy selected text to clipboard
  } catch (e) {
    copysuccess = false
  }
  return copysuccess
}

function copy(e) {
  selectElementText(e)
  var copysuccess = copySelectionText()

  return copysuccess
}

window.draw = draw;

