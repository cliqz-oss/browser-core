/* global window, document */
/* eslint-disable no-param-reassign */
import $ from 'jquery';
import Handlebars from 'handlebars';
import helpers from './content/helpers';
import { sendMessageToWindow } from './content/data';
import templates from './templates';

function localizeDocument() {
  Array.from(document.querySelectorAll('[data-i18n]')).forEach((el) => {
    const elArgs = el.dataset.i18n.split(',');
    const key = elArgs.shift();

    el.innerHTML = chrome.i18n.getMessage(key, elArgs);
  });
}

function resize() {
  const $videoDownloader = $('#video-downloader');
  const width = $videoDownloader.width();
  const height = $videoDownloader.height();
  sendMessageToWindow({
    action: 'resize',
    data: {
      width,
      height,
    }
  });
}

function hidePopup() {
  sendMessageToWindow({
    action: 'hidePopup',
    data: {}
  });
}

$(() => {
  Object.keys(helpers).forEach((helperName) => {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  sendMessageToWindow({
    action: 'getMockData',
    data: {}
  });
});

$(document).on('click', '#more-formats-btn', (e) => {
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

$(document).on('click', '#send-to-mobile-btn', function btnClick(e) {
  e.stopPropagation();
  const $this = $(this);
  const resend = $('#send-to-mobile-btn').text() ===
    chrome.i18n.getMessage('pairing-send-video-to-mobile-retry');
  const dataToSend = {
    url: $this.attr('data-href'),
    title: $this.attr('data-title'),
    format: $this.attr('data-format'),
    resend,
  };
  $this.attr('class', 'disabled');
  sendMessageToWindow({
    action: 'sendToMobile',
    data: dataToSend,
  });
});

$(document).on('click', '#download-links li', function itemClick(e) {
  e.stopPropagation();
  const $p = $(this).find('p');
  sendMessageToWindow({
    action: 'download',
    data: {
      url: $p.attr('data-href'),
      filename: $p.attr('download'),
      size: $(this).find('span').text(),
      format: $p.attr('data-format').toLowerCase().replace(' ', '_'),
      origin: decodeURI($p.attr('data-origin'))
    }
  });
  hidePopup();
});

$(document).on('click', '#pairing-dashboard', () => {
  sendMessageToWindow({
    action: 'openConnectPage',
    data: {}
  });
  hidePopup();
});

function draw(data) {
  if (data.sendingStatus) {
    if (data.sendingStatus === 'success') {
      $('#sending-status').attr('src', 'images/checkbox-green.svg');
    } else {
      $('#sending-status').attr('src', 'images/checkbox-red.svg');

      $('#send-to-mobile-btn').removeClass('disabled');
      $('#send-to-mobile-btn').text(chrome.i18n.getMessage('pairing-send-video-to-mobile-retry'));
    }
  } else {
    $('#video-downloader').html(templates.template(data));
  }
  localizeDocument();
  resize();
}

window.draw = draw;
