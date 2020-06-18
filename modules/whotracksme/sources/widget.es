/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import TrackersPopup from './popup';
import {
  SVG_CHART_STYLES,
  INNER_WIDGET_STYLES,
  OUTER_WIDGET_STYLES,
} from './styles';
import generateChartSVG from './chart';

let popup = null;

export default function createChartWidget(trackerData) {
  const { reportUrl, total, debug } = trackerData;
  const root = document.createElement('div');
  const mode = debug ? 'open' : 'closed';
  const shadow = root.attachShadow({ mode });
  const svg = generateChartSVG(trackerData);
  const totalHTML = total ? `<span id="num">${total}</span>` : '';
  const html = `
    <style>
      ${SVG_CHART_STYLES}
      ${INNER_WIDGET_STYLES}
    </style>
    <a rel="noreferrer noopener" href="${reportUrl}" id="link" target="_blank">
      ${svg}
      ${totalHTML}
    </a>
  `;
  shadow.innerHTML = html;
  const link = shadow.querySelector('a');
  link.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (!popup) {
      popup = new TrackersPopup({ debug });
    }
    popup.show(trackerData, link);
  });
  root.style = OUTER_WIDGET_STYLES;
  return root;
}
