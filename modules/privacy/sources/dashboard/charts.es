/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global Chart */
import moment from 'moment';

export default function plotBar(ctx, dailyStats, metric, label) {
  // eslint-disable-next-line
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dailyStats.map(d => moment(d.day, 'YYYY-MM-DD')),
      datasets: [
        {
          label,
          data: dailyStats.map(d => ({
            x: moment(d.day, 'YYYY-MM-DD'),
            y: d[metric]
          })),
          backgroundColor: Array(dailyStats.length).fill('#5755d9'),
          hoverBackgroundColor: Array(dailyStats.length).fill('#363587')
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      legend: {
        display: false
        // position: 'top'
      },
      scales: {
        xAxes: [{
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'MMM DD'
            }
          },
          offset: true,
          maxBarThickness: 40,
          gridLines: {
            display: false
          }
        }],
        yAxes: [{
          display: false
        }]
      },
    }
  });
}
