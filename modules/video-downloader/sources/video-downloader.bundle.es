/* global window, document */
/* eslint-disable no-param-reassign */
import $ from 'jquery';
import Handlebars from 'handlebars';
import helpers from './content/helpers';
import { sendMessageToWindow } from './content/data';
import templates from './templates';

Handlebars.partials = templates;

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

let lastClickedId;

$(document).on('click', 'ul.vd-tabs li', function itemClick(e) {
  e.stopPropagation();
  const tabId = $(this).attr('data-tab');
  if (tabId === lastClickedId) {
    return;
  }

  lastClickedId = tabId;

  sendMessageToWindow({
    action: 'sendTelemetry',
    data: {
      action: 'click',
      target: tabId,
    }
  });

  $('ul.vd-tabs li').removeClass('active');
  $(this).addClass('active');

  $('#vd-tab-content').attr('class', tabId);
  resize();
});

$(document).on('click', '.link-button', function btnClick(e) {
  e.stopPropagation();
  const selectedItem = $("#download-links input[type='radio']:checked")[0];
  const url = selectedItem.dataset.href;
  const filename = selectedItem.value;
  const title = selectedItem.dataset.title;
  const type = selectedItem.dataset.type;
  const size = selectedItem.dataset.size;
  const format = selectedItem.dataset.format.toLowerCase().replace(' ', '_');
  const origin = decodeURI(selectedItem.dataset.origin);
  const buttonId = $(this)[0].id;

  if (buttonId === 'download-desktop') {
    sendMessageToWindow({
      action: 'download',
      data: {
        url,
        filename,
        size,
        format,
        origin,
      }
    });
  } else if (buttonId === 'download-mobile') {
    sendMessageToWindow({
      action: 'sendToMobile',
      data: {
        url,
        title,
        type,
        format,
      }
    });

    $('#sending-status').addClass('show');
    setTimeout(() => {
      $('#sending-status').removeClass('show');
    }, 5000);
  }
});

$(document).on('click', '.connect-page-link', () => {
  sendMessageToWindow({
    action: 'openConnectPage',
    data: {}
  });
  hidePopup();
});

function setHTML(el, html) {
  if (el.unsafeSetInnerHTML) {
    el.unsafeSetInnerHTML(html);
  } else {
    el.innerHTML = html;
  }
}

function draw(data) {
  if (data.hidePairingIframe) {
    $('#connect-iframe').addClass('hidden');
  } else {
    setHTML($('#video-downloader').get(0), templates.template(data));
  }
  localizeDocument();
  resize();
}

window.draw = draw;
