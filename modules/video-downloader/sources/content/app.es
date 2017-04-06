import helpers from 'video-downloader/content/helpers';
import { messageHandler, sendMessageToWindow } from 'video-downloader/content/data';
import $ from 'jquery';
import Handlebars from 'handlebars';
import templates from 'video-downloader/templates';

Handlebars.partials = templates;

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), el => {
    var elArgs = el.dataset.i18n.split(','),
        key = elArgs.shift();

    el.innerHTML = chrome.i18n.getMessage(key, elArgs);
  });
}

function resize() {
  var $videoDownloader = $('#video-downloader');
  var width = $videoDownloader.width();
  var height = $videoDownloader.height();
  sendMessageToWindow({
    action: 'resize',
    data: {
      width: width,
      height: height,
    }
  });
}

$(document).ready(function() {
  Object.keys(helpers).forEach(function (helperName) {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  sendMessageToWindow({
    action: 'getMockData',
    data: {}
  });
});

$(document).on('click', '#more-formats-btn', function(e) {
  e.stopPropagation();
  $('#download-links .hidden').attr('class', '');
  $('#more-formats-btn').css('display', 'none');
  resize();
  sendMessageToWindow({
    action: 'sendTelemetry',
    data: {
      action: 'click',
      target: 'more_formats'
    }
  });
});

$(document).on('click', '#send-to-mobile-btn', function(e) {
  e.stopPropagation();
  var resend = $('#send-to-mobile-btn').text() ===
    chrome.i18n.getMessage('pairing-send-video-to-mobile-retry');
  var dataToSend = {
    url: $(this).attr('data-href'),
    title: $(this).attr('data-title'),
    format: $(this).attr('data-format'),
    resend,
  }
  $(this).attr('class', 'disabled');
  sendMessageToWindow({
    action: 'sendToMobile',
    data: dataToSend,
  });
});

$(document).on('click', '#download-links li', function(e) {
  e.stopPropagation();
  sendMessageToWindow({
    action: 'download',
    data: {
      url: $(this).find('p').attr('data-href'),
      filename: $(this).find('p').attr('download'),
      size: $(this).find('span').text(),
      format: $(this).find('p').attr('data-format').toLowerCase().replace(" ", "_")
    }
  });
  hidePopup();
});

$(document).on('click', '#pairing-dashboard', function(){
  hidePopup();
});

function hidePopup () {
  sendMessageToWindow({
    action: 'hidePopup',
    data: {}
  });
}

function draw(data) {
  if(data.sendingStatus) {
    if(data.sendingStatus === 'success') {
      $('#sending-status').attr('src', 'images/checkbox-green.svg');
    } else {
      $('#sending-status').attr('src', 'images/checkbox-red.svg');

      $('#send-to-mobile-btn').removeClass('disabled');
      $('#send-to-mobile-btn').text(chrome.i18n.getMessage('pairing-send-video-to-mobile-retry'));
    }
  } else {
    $('#video-downloader').html(templates['template'](data));
  }
  localizeDocument();
  resize();
}

window.draw = draw;
