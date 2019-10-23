/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const baseTheme = {
  container: {
    bgColor: 'rgba(243, 244, 245, 0.93)',
  },
  card: {
    bgColor: '#fff',
    borderRadius: 9,
    sidePadding: 7,
  },
  snippet: {
    titleColor: '#003172',
    urlColor: '#4FB359',
    descriptionColor: 'rgba(0, 0, 0, 0.61)',
    visitedTitleColor: '#610072',
    iconColor: 'rgba(0, 0, 0, 0.61)',
    iconColorARGB: '#9B000000',
    separatorColor: '#D9D9D9',
    titleFontSize: 17,
    titleLineHeight: 20,
    mainIconSize: 28,
    subtitleFontSize: 14.5,
    iconMarginRight: 6,
    historyIconSize: 17,
    bulletIconSize: 5,
  },
  searchEngine: {
    textColor: 'rgba(0, 0, 0, 0.54)',
    buttonBgColor: 'rgba(0, 0, 0, 0.08)',
    buttonColor: '#000',
    ghostyColorARGB: '#AAFFFFFF',
  },
};

export const mergeStyles = (base, styles) => {
  const merged = { ...base };

  for (const key of Object.keys(styles)) {
    const value = styles[key];
    if (value !== undefined) {
      merged[key] = { ...merged[key], ...value };
    }
  }

  return merged;
};

export default {
  dark: mergeStyles(baseTheme, {
    container: {
      bgColor: 'rgba(0, 9, 23, 0.85)'
    },
    card: {
      bgColor: 'rgba(255, 255, 255, 0.12)',
    },
    snippet: {
      titleColor: '#fff',
      urlColor: '#74C17C',
      descriptionColor: 'rgba(255, 255, 255, 0.61)',
      visitedTitleColor: '#BDB6FF',
      iconColor: 'rgba(255, 255, 255, 0.61)',
      iconColorARGB: '#B0B0BA',
      separatorColor: '#5C6A75'
    },
    searchEngine: {
      textColor: 'rgba(255, 255, 255, 0.54)',
      buttonBgColor: 'rgba(255, 255, 255, 0.2)',
      buttonColor: '#fff',
      ghostyColorARGB: '#54FFFFFF'
    },
  }),
  light: baseTheme,
  'lumen-light': baseTheme,
};
