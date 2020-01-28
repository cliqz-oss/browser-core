/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Youtube from './extractors/youtube';

const EXTRACTORS = [
  Youtube,
];

function isVideoURL(url) {
  return EXTRACTORS.some(x => x.isVideoURL(url));
}

function getRawVideoInfo(url) {
  const extractor = EXTRACTORS.find(x => x.isVideoURL(url));
  if (extractor) {
    return extractor.getVideoInfo(url);
  }
  return Promise.reject();
}

function getSize(size) {
  if (size >= 1073741824) {
    return `${parseFloat((size / 1073741824).toFixed(1))} GB`;
  }

  if (size >= 1048576) {
    return `${parseFloat((size / 1048576).toFixed(1))} MB`;
  }

  return `${parseFloat((size / 1024).toFixed(1))} KB`;
}

/* eslint-disable no-param-reassign */
function getSizes(formats) {
  return Promise.all(formats.map(async (x) => {
    try {
      let size = x.size;

      // If size was not already found in response from ytdl library we try to
      // get it by performing a HEAD request to the video's URL and use the
      // content-length header.
      if (!size) {
        const response = await fetch(new Request(x.url, { method: 'HEAD' }));
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        size = Number(response.headers.get('content-length')) || 0;
      }

      x.size = getSize(size);
    } catch (ex) {
      x.size = 0;
    }

    return x;
  }));
}
/* eslint-enable no-param-reassign */

function getVideoInfo(url) {
  return getRawVideoInfo(url)
    .then(getSizes);
}

export { isVideoURL, getVideoInfo, getRawVideoInfo };
