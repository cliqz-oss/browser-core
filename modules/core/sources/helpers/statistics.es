/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function sum(arr) {
  let total = 0.0;
  for (let i = 0; i < arr.length; i += 1) {
    total += arr[i];
  }
  return total;
}


export function mean(arr) {
  if (arr.length === 0) {
    throw new Error('cannot compute mean of empty array.');
  }

  return sum(arr) / arr.length;
}


export function median(arr) {
  if (arr.length === 0) {
    throw new Error('cannot compute median of empty array.');
  }

  arr.sort((a, b) => a - b);

  const half = Math.floor(arr.length / 2);

  if (arr.length % 2) return arr[half];
  return (arr[half - 1] + arr[half]) / 2.0;
}
