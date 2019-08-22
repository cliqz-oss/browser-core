/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global document, window, $, Handlebars */
/* eslint-disable no-param-reassign */
import helpers from './content/helpers';
import templates from './templates';
import createModuleWrapper from '../core/helpers/action-module-wrapper';

const videoDownloader = createModuleWrapper('video-downloader');
Handlebars.partials = templates;

function localizeDocument() {
  Array.from(document.querySelectorAll('[data-i18n]')).forEach((el) => {
    const elArgs = el.dataset.i18n.split(',');
    const key = elArgs.shift();

    el.innerHTML = chrome.i18n.getMessage(key, elArgs);
  });
}

function draw(data) {
  if (data.hidePairingIframe) {
    $('#connect-iframe').addClass('hidden');
  } else {
    $('#video-downloader').html(templates.template(data));
  }
  localizeDocument();
}

$(() => {
  Object.keys(helpers).forEach((helperName) => {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  $('#video-downloader').html(templates.template({ loading: true }));

  videoDownloader.getVideoLinks(undefined).then(draw);
});

let lastClickedId;

$(document).on('click', 'ul.vd-tabs li', function itemClick(e) {
  e.stopPropagation();
  const tabId = $(this).attr('data-tab');
  if (tabId === lastClickedId) {
    return;
  }

  lastClickedId = tabId;

  videoDownloader.telemetry({
    action: 'click',
    target: tabId,
  });

  $('ul.vd-tabs li').removeClass('active');
  $(this).addClass('active');

  $('#vd-tab-content').attr('class', tabId);
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
    videoDownloader.download({
      url,
      filename,
      size,
      format,
      origin,
    }).then(window.close);
  } else if (buttonId === 'download-mobile') {
    videoDownloader.sendToMobile({
      url,
      title,
      type,
      format,
    });

    $('#sending-status').addClass('show');
    setTimeout(() => {
      $('#sending-status').removeClass('show');
    }, 5000);
  }
});

$(document).on('click', '.connect-page-link', () => {
  videoDownloader.openConnectPage();
});
