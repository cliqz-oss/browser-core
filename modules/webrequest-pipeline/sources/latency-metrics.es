/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import telemetry from '../core/services/telemetry';
import pacemaker from '../core/services/pacemaker';


const BINS = [
  /* 0 => */ '0',
  /* 1 => */ '1',
  /* 2 => */ '2',
  /* 3 => */ '3',
  /* 4 => */ '4',
  /* 5 => */ '5-9',
  /* 6 => */ '5-9',
  /* 7 => */ '5-9',
  /* 8 => */ '5-9',
  /* 9 => */ '5-9',
  /* 10 => */ '10-14',
  /* 11 => */ '10-14',
  /* 12 => */ '10-14',
  /* 13 => */ '10-14',
  /* 14 => */ '10-14',
  /* 15 => */ '15-19',
  /* 16 => */ '15-19',
  /* 17 => */ '15-19',
  /* 18 => */ '15-19',
  /* 19 => */ '15-19',
  /* 20 => */ '20-24',
  /* 21 => */ '20-24',
  /* 22 => */ '20-24',
  /* 23 => */ '20-24',
  /* 24 => */ '20-24',
  /* 25 => */ '25-29',
  /* 26 => */ '25-29',
  /* 27 => */ '25-29',
  /* 28 => */ '25-29',
  /* 29 => */ '25-29',
  /* 30 => */ '30-39',
  /* 31 => */ '30-39',
  /* 32 => */ '30-39',
  /* 33 => */ '30-39',
  /* 34 => */ '30-39',
  /* 35 => */ '30-39',
  /* 36 => */ '30-39',
  /* 37 => */ '30-39',
  /* 38 => */ '30-39',
  /* 39 => */ '30-39',
  /* 40 => */ '40-49',
  /* 41 => */ '40-49',
  /* 42 => */ '40-49',
  /* 43 => */ '40-49',
  /* 44 => */ '40-49',
  /* 45 => */ '40-49',
  /* 46 => */ '40-49',
  /* 47 => */ '40-49',
  /* 48 => */ '40-49',
  /* 49 => */ '40-49',
  /* 50 => */ '50-59',
  /* 51 => */ '50-59',
  /* 52 => */ '50-59',
  /* 53 => */ '50-59',
  /* 54 => */ '50-59',
  /* 55 => */ '50-59',
  /* 56 => */ '50-59',
  /* 57 => */ '50-59',
  /* 58 => */ '50-59',
  /* 59 => */ '50-59',
  /* 60 => */ '60-69',
  /* 61 => */ '60-69',
  /* 62 => */ '60-69',
  /* 63 => */ '60-69',
  /* 64 => */ '60-69',
  /* 65 => */ '60-69',
  /* 66 => */ '60-69',
  /* 67 => */ '60-69',
  /* 68 => */ '60-69',
  /* 69 => */ '60-69',
];


export default class Latency {
  constructor(name) {
    this.name = name; // pipeline base-name
    this.flushInterval = null;

    // Latency metrics will be stored for each step name
    this.total = 0; // number of requests seen so far
    this.histograms = null;
    this.resetTimings();
  }

  resetTimings() {
    this.total = 0;
    this.histograms = Object.create(null);
  }

  init() {
    this.flushInterval = pacemaker.everyFewMinutes(this.flush.bind(this));
  }

  unload() {
    pacemaker.clearTimeout(this.flushInterval);
    this.flushInterval = null;
  }

  addTiming(step, elapsedTime) {
    // Get histogram for `step`, defaulting to empty histogram
    let histogram = this.histograms[step];
    if (histogram === undefined) {
      histogram = Object.create(null);
      this.histograms[step] = histogram;
    }

    // Store timing in corresponding bin using our pre-defined `BINS` mapping
    const bin = elapsedTime < 70 ? BINS[elapsedTime] : '70+';
    histogram[bin] = (histogram[bin] || 0) + 1;

    // Every 5k request, we flush
    this.total += 1;
    if (this.total >= 5000) {
      this.flush();
    }
  }

  async flush() {
    if (this.total === 0) {
      return;
    }

    const histogramsMetric = Object.keys(this.histograms).map(step => ({
      step: `${this.name}.${step}`,
      histogram: this.histograms[step],
    }));

    this.resetTimings();
    await telemetry.push(
      histogramsMetric,
      'metrics.performance.webrequest-pipeline.timings',
    );
  }
}
