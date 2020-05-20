/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export const POPUP_WIDTH = 340;

export const INNER_WIDGET_STYLES = `
  #link {
    display: flex;
    user-select: none;
    text-decoration: none;
    position: relative;
    bottom: -2px;
  }

  #link:hover {
    color: #333;
  }

  #circle {
    height: 16px;
    width: 16px;
  }

  #num {
    margin-left: 2px;
    color: #9e9e9e;
    font-size: 11px;
  }
`;

export const OUTER_WIDGET_STYLES = `
  min-width: 16px;
  height: 16px;
  display: inline-block;
  vertical-align: baseline;
  margin-left: 5px;
`;

export const OUTER_POPUP_STYLES = `
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: ${Number.MAX_SAFE_INTEGER};
`;

export const INNER_POPUP_STYLES = `
  #overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: ${Number.MAX_SAFE_INTEGER - 1};
    background: rgba(0, 0, 0, 0.2);
  }

  #popup {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: ${Number.MAX_SAFE_INTEGER};
    background: #fff;
    box-shadow: 0 2px 5px 0 rgba(19,41,104,.2);
    border-radius: 8px;
  }

  #title {
    padding: 14px 50px 14px 14px;
    position: relative;
  }

  #title h1, #title h2 {
    margin: 0;
    padding: 0;
    font-weright: normal;
  }
  
  #title h1 {
    color: #212121;
    font-size: 20px;
  }

  #title h2 {
    font-size: 14px;
    color: #2e7d32;
  }

  #close {
    position: absolute;
    top: 4px;
    right: 4px;
    border: 0;
    padding: 12px;
    font-size: 27px;
    background: #fff;
    line-height: .6;
  }

  #main {
    width: ${POPUP_WIDTH}px;
    padding: 14px;
    overflow: hidden;
    display: flex;
  }

  #chart {
    width: 47%;
  }

  #total {
    top: 53%;
    left: 23%;
    position: absolute;
    font-size: 45px;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  #legend {
    width: 53%;
    list-style: none;
  }

  .category {
    padding: 0;
    margin: 0;
    width: 8px;
    height: 8px;
    display: inline-block;
    margin-right: 4px;
    border-radius: 50%;
    vertical-align: baseline;
  }

  .category-title {
    color: #757575;
    font-size: 11px;
  }

  #report {
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    padding: 16px;
    font-size: 14px;
  }

  #report a {
    text-decoration: none;
    color: #e0e0e0;
  }

  #report a[href] {
    color: rgb(42, 27, 146);
  }

  #report a[href]:hover {
    text-decoration: underline;
  }
`;

// TODO split
export const SVG_CHART_STYLES = `
  /* START TRACKERS CHART */
  @keyframes dash {
    from {
      stroke-dashoffset: 1000;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  #circle > g {
    fill: none;
    stroke-width: 38;
    transform: translate(100px, 100px);
  }
  .path {
    stroke-dashoffset: 0;
    stroke-dasharray: 1000;
    animation: dash calc(var(--stroke-length, 0) * 0.5ms) linear
      alternate 1;
  }
  .path:hover {
    opacity: 0.8;
  }
  .path[data-category='advertising'] {
    stroke: #cb55cd;
  }
  .path[data-category='audio_video_player'] {
    stroke: #ef671e;
  }
  .path[data-category='cdn'] {
    stroke: #43b7c5;
  }
  .path[data-category='customer_interaction'] {
    stroke: #fdc257;
  }
  .path[data-category='essential'] {
    stroke: #fc9734;
  }
  .path[data-category='misc'] {
    stroke: #ecafc2;
  }
  .path[data-category='site_analytics'] {
    stroke: #87d7ef;
  }
  .path[data-category='social_media'] {
    stroke: #388ee8;
  }
  .path[data-category='hosting'] {
    stroke: #e8e8e8;
  }
  .path[data-category='pornvertising'] {
    stroke: #fb5b8b;
  }
  .path[data-category='extensions'] {
    stroke: #e2e781;
  }
  .path[data-category='comments'] {
    stroke: #b0a8ff;
  }
  .path[data-category='unknown'] {
    stroke: #959595;
  }
  .path[data-category='default'] {
    stroke: #dedede;
  }
  .path[data-category='no_tracker'] {
    stroke: #94c59e;
  }
  .category[data-category='advertising'] {
    background-color: #cb55cd;
  }
  .category[data-category='audio_video_player'] {
    background-color: #ef671e;
  }
  .category[data-category='cdn'] {
    background-color: #43b7c5;
  }
  .category[data-category='customer_interaction'] {
    background-color: #fdc257;
  }
  .category[data-category='essential'] {
    background-color: #fc9734;
  }
  .category[data-category='misc'] {
    background-color: #ecafc2;
  }
  .category[data-category='site_analytics'] {
    background-color: #87d7ef;
  }
  .category[data-category='social_media'] {
    background-color: #388ee8;
  }
  .category[data-category='hosting'] {
    background-color: #e8e8e8;
  }
  .category[data-category='pornvertising'] {
    background-color: #fb5b8b;
  }
  .category[data-category='extensions'] {
    background-color: #e2e781;
  }
  .category[data-category='comments'] {
    background-color: #b0a8ff;
  }
  .category[data-category='unknown'] {
    background-color: #959595;
  }
  .category[data-category='default'] {
    background-color: #dedede;
  }
  .category[data-category='no_tracker'] {
    background-color: #94c59e;
  }
  /* END TRACKERS CHART */
`;
