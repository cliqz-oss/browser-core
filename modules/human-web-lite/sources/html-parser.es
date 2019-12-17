/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// TODO: here we need something that works in react-native.
// The following code is copied from human-web and probably
// will not work outside of the browser.
//
// If there are problems, maybe one of the libraries mentioned here
// can be used on Mobile:
// * https://stackoverflow.com/q/38343951/783510
//
// Note: In jsdom, this implementation should work:
//
//   return new JSDOM(html).window.document;
//
// However, it is hard to use jsdom outside of NodeJs.
// I failed to get it working in the Browser, for example.
//
import window from '../core/globals-window';

export default function parseHtml(html) {
  if (!parseHtml.domParser) {
    parseHtml.domParser = new window.DOMParser();
  }

  return parseHtml.domParser.parseFromString(html, 'text/html');
}
