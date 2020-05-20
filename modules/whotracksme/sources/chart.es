/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

function fromTrackersToChartData(trackers, sum) {
  if (!trackers.length || sum === 0) {
    // No information about trackers available
    return {
      sum: 0,
      arcs: [{
        start: 0,
        end: 360,
        categoryId: 'default',
        categoryName: 'Default',
        count: 0,
      }],
    };
  }

  const arcs = [];
  let startAngle = 0;

  for (let i = 0; i < trackers.length; i += 1) {
    const endAngle = startAngle + (trackers[i].numTotal * 360) / sum;

    arcs.push({
      start: startAngle,
      end: endAngle,
      categoryId: trackers[i].id,
      categoryName: trackers[i].name,
      count: trackers[i].numTotal,
    });

    startAngle = endAngle;
  }

  return {
    sum,
    arcs,
  };
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, endAngle);
  const length = endAngle - startAngle;

  const largeArcFlag = length <= 180 ? '0' : '1';

  const d = [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    1,
    end.x,
    end.y,
  ].join(' ');

  return { d, length };
}

function path(arc) {
  const { start, categoryId } = arc;
  // Fix error for single path
  const end = arc.end === 360 ? 359.9999 : arc.end;
  const r = 100;
  const { d, length } = describeArc(0, 0, r, start, end);

  return `
    <path
      d="${d}"
      data-category="${categoryId}"
      class='path'
      style="--stroke-length: ${length}"
    >
      <title>${arc.count}</title>
    </path>
  `;
}

export default function generateChartSVG({ total, trackers }) {
  const chartData = fromTrackersToChartData(trackers, total);
  const paths = chartData.arcs.map(arc => path(arc)).join('\n');
  return `
    <svg
      id='circle'
      xmlns='http://www.w3.org/2000/svg'
      version='1.1'
      width='100%'
      height='100%'
      viewBox='-20 -20 240 240'
    >
      <g>${paths}</g>
    </svg>
  `;
}
