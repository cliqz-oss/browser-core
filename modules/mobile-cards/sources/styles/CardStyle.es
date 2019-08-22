/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Dimensions } from 'react-native';


export const { width: vpWidth, height: vpHeight } = Dimensions.get('window');

export function getScreenHeight() {
  return Dimensions.get('screen').height - 80;
}

export function getVPWidth() {
  return Dimensions.get('window').width;
}

export function getVPHeight() {
  return Dimensions.get('window').height;
}

export function widthPercentage(percentage) {
  const value = (percentage * getVPWidth()) / 100;
  return Math.round(value);
}

export function getCardWidth() {
  return widthPercentage(84);
}

export const cardWidth = () => getCardWidth();
export const cardsGap = widthPercentage(4);

export const elementSideMargins = {
  marginLeft: 12,
  marginRight: 12,
};

export const elementSidePaddings = {
  paddingLeft: 12,
  paddingRight: 12,
};

export const elementTopMargin = {
  marginTop: 14,
};

export const cardBorderTopRadius = {
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
};

export const cardBorderBottomRadius = {
  borderBottomLeftRadius: 10,
  borderBottomRightRadius: 10,
};

export const cardMargins = {
  marginBottom: 50,
  marginTop: 5,
};

export const highlightedBackgroundColor = 'rgba(0, 0, 0, 0.7)';
export const separatorColor = 'rgba(255, 255, 255, 0.5)';
