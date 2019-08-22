/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const RENDER_KEYS = ['app', 'customDials', 'historyDials', 'news', 'search', 'stats'];
const DATA_KEYS = ['customDials', 'historyDials', 'news', 'stats'];
const TOTAL_KEYS = ['app'];

export default class Timer {
  constructor(sendTelemetryFn) {
    this._sendTelemetry = sendTelemetryFn;
    this.appRenderStart = window.performance.now();
    this.render = this.renderEmptyTimer(RENDER_KEYS);
    this.data = this.renderEmptyTimer(DATA_KEYS);
    this.total = this.renderEmptyTimer(TOTAL_KEYS);
    this.sent = false;
  }

  renderEmptyTimer = (keys) => {
    const timer = {};
    keys.forEach((key) => { timer[key] = -1; });
    return timer;
  }

  get dataTimers() { return this.data; }

  get renderTimers() { return this.render; }

  get totalTimers() { return this.total; }

  updateDataTimer = ({
    name,
    value = window.performance.now() - this.appRenderStart
  }) => { this.dataTimers[name] = value; }

  updateRenderTimer = ({ name, value }) => { this.renderTimers[name] += value; }

  updateTotalTimer = ({ name }) => {
    this.totalTimers[name] = window.performance.now() - this.appRenderStart;
  }

  sendTelemetry = () => {
    if (this.sent) return;

    this._sendTelemetry({
      type: 'home',
      dataTimers: this.dataTimers,
      renderTimers: this.renderTimers,
      totalTimers: this.totalTimers,
    },
    false,
    '');

    this.sent = true;
  }
}
