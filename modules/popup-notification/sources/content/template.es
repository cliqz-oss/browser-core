/* eslint-disable import/prefer-default-export */

import escape from './escape';

function _getLabelsTemplate(chrome, labels = []) {
  const locale = key => chrome.i18n.getMessage(key);
  return labels.map(label => `
    <div class="label ${label}">${locale(`offers_${label}`)}</div>
  `).join('');
}

function _getConditions(chrome, conditions) {
  return conditions
    ? `<div class="conditions">
      <div class="tooltip">
        <span class="tooltip-text">${escape(conditions)}</span>
        ${chrome.i18n.getMessage('offers_conditions')} &#9432
      </div>
    </div>`
    : '';
}

function getTemplate(chrome, {
  ghostery,
  logoText,
  benefit,
  headline,
  code,
  labels,
  conditions,
  shouldHideButtons,
}) {
  return `
    <div class="content">
      <div class="header">
        <div class="offer-logo"></div>
        <div class="offer-logo-text">${logoText}</div>
        <div class="billet"></div>
        <div class="btn-close"></div>
      </div>
      <div class="sub-header">
        <div class="labels">${_getLabelsTemplate(chrome, ghostery ? [] : labels)} </div>
        <div class="billet"></div>
        <div class="wrapper">
          <div class="logo"></div>
        </div>
        <div class="billet"></div>
      </div>
      <div class="middle">
        <div class="benefit">${escape(benefit)}</div>
        <div class="headline">${escape(headline)}</div>
      </div>
      <div class="footer">
        <div class="code-wrapper">
          <input
            class="promo-code"
            value="${escape(code)}"
            readonly="readonly"
            type="text">
          <span class="copy-code">${chrome.i18n.getMessage('offers_hub_copy_btn')}</span>
        </div>
        ${_getConditions(chrome, conditions)}
        <button class="btn-cancel ${shouldHideButtons ? 'none' : ''}">
          ${chrome.i18n.getMessage('popup_cancel_button')}
        </button>
        <button class="btn-apply ${shouldHideButtons ? 'none' : ''}">
          ${chrome.i18n.getMessage('popup_apply_code_button')}
        </button>
        <div class="footer-billet"></div>
      </div>
    </div>`;
}

export { getTemplate };
