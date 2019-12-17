/* eslint-disable import/prefer-default-export */

import escape from './escape';

function _getConditions(chrome, conditions) {
  return conditions
    ? `<div class="conditions">
      <div class="tooltip">
        <span class="tooltip-text">${escape(conditions)}</span>
        ${chrome.i18n.getMessage('myoffrz_conditions')} &#9432
      </div>
    </div>`
    : '';
}

function getTemplate(chrome, {
  logoText,
  benefit,
  headline,
  code,
  conditions,
  shouldHideButtons,
  logo_dataurl: logoDataurl,
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
        <div class="labels"></div>
        <div class="billet"></div>
        <div class="wrapper">
          <div class="logo" style="background-image: url(${logoDataurl})"></div>
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
          <span class="copy-code">${chrome.i18n.getMessage('myoffrz_copy_code')}</span>
        </div>
        ${_getConditions(chrome, conditions)}
        <button class="btn-cancel ${shouldHideButtons ? 'none' : ''}">
          ${chrome.i18n.getMessage('myoffrz_cancel')}
        </button>
        <button class="btn-apply ${shouldHideButtons ? 'none' : ''}">
          ${chrome.i18n.getMessage('myoffrz_apply_code')}
        </button>
        <div class="footer-billet"></div>
      </div>
    </div>`;
}

export { getTemplate };
