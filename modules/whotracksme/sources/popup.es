/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import generateChartSVG from './chart';
import {
  SVG_CHART_STYLES,
  INNER_POPUP_STYLES,
  OUTER_POPUP_STYLES,
  POPUP_WIDTH,
} from './styles';

const generateLegendHTML = ({ trackers }) => trackers
  .map(tracker => `
    <li>
      <span class="category" data-category="${tracker.id}"></span>
      <span class="category-title">${tracker.name}</span>
    </li>
  `).join('');

export default class TrackersPopup {
  constructor({ debug }) {
    const root = document.createElement('div');
    const mode = debug ? 'open' : 'closed';
    const shadow = root.attachShadow({ mode });
    const html = `
      <style>
        ${INNER_POPUP_STYLES}
        ${SVG_CHART_STYLES}
      </style>
      <div id="overlay"></div>
      <div id="popup">
        <div id="title">
          <h1 id="header"></h1>
          <h2 id="domain"></h2>
          <button id="close">✕</button>
        </div>
        <div id="main">
          <div id="total"></div>
          <div id="chart"></div>
          <ul id="legend"></ul>
        </div>
        <div id="report">
          <a rel="noreferrer noopener" href="#" id="link" target="_blank">
            ${chrome.i18n.getMessage('whotracksme_statistical_report')}&nbsp;›
          </a>
        </div>
      </div>
    `;
    shadow.innerHTML = html;
    root.style = OUTER_POPUP_STYLES;

    ['overlay', 'popup', 'domain', 'close', 'chart', 'total', 'legend', 'link', 'report', 'header']
      .forEach((id) => {
        this[`_${id}`] = shadow.querySelector(`#${id}`);
      });

    this._pocket = document.createDocumentFragment();

    this._root = root;
    this._overlay.addEventListener('click', this.hide);
    this._close.addEventListener('click', this.hide);
  }

  position(node) {
    const { x, y } = node.getBoundingClientRect();
    const height = this._popup.offsetHeight;
    const left = Math.max(x - POPUP_WIDTH / 2, 3);
    const top = Math.max(y - height, 3);
    this._popup.style.top = `${top}px`;
    this._popup.style.left = `${left}px`;
    this._overflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
  }

  show(trackerData, node) {
    const { domain, reportUrl, total } = trackerData;
    this._domain.textContent = domain;
    if (total === 0) {
      this._link.removeAttribute('href');
      this._header.textContent = chrome.i18n.getMessage('whotracksme_no_info_header');
    } else {
      this._link.href = reportUrl;
      this._header.textContent = chrome.i18n.getMessage('whotracksme_trackers_seen_header');
    }
    this._chart.innerHTML = generateChartSVG(trackerData);
    this._legend.innerHTML = generateLegendHTML(trackerData);
    this._total.textContent = total;
    this._total.hidden = total === 0;
    this._domain.hidden = total === 0;
    window.document.body.after(this._root);
    this.position(node);
  }

  hide = () => {
    this._pocket.append(this._root);
    window.document.body.style.overflow = this._overflow;
  }
}
