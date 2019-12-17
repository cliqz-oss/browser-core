/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Youtube from './extractors/youtube';
import sanitizeFilename from '../platform/lib/sanitize-filename';

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

function getFormats(info) {
  if (info.formats.length > 0) {
    const videos = [];
    let audio;
    info.formats.forEach((item) => {
      if (item.size === 0) {
        return;
      }
      if (item.container === 'm4a' || item.container === 'mp4') {
        const media = {
          url: item.url,
          title: sanitizeFilename(info.title, { replacement: ' ' }).slice(0, 250),
          format: item.container,
        };
        if (item.container === 'm4a') {
          media.name = 'Audio';
          media.class = 'audio';
          audio = media;
        } else if (item.audioBitrate !== null && item.resolution !== null) {
          media.name = `${item.container.toUpperCase()} ${item.resolution}`;
          media.class = 'video';
          videos.push(media);
        }
      }
    });
    if (audio) {
      videos.push(audio);
    }
    return videos;
  }
  return [];
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
    .then(getFormats)
    .then(getSizes);
}

export { isVideoURL, getVideoInfo, getRawVideoInfo };
