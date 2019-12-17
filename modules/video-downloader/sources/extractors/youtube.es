/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getInfo from '../../platform/video-downloader/lib/ytdl-core';
import platform from '../../platform/platform';
import getYoutubeID from '../utils/get-youtube-id';

// This takes a bit, not perfect... Will it be blocked if too much traffic?
function handleFormats(formats) {
  return formats.map(data => ({
    audioBitrate: data.audioBitrate,
    container: data.container,
    size: data.contentLength ? (Number(data.contentLength) || 0) : undefined,
    resolution: data.qualityLabel,
    url: data.url,
  }));
}

export default class YoutubeExtractor {
  static isVideoURL(url) {
    try {
      const id = getYoutubeID(url);
      return !!id;
    } catch (e) {
      // Nothing...
    }
    return false;
  }

  static getVideoInfo(url) {
    const id = getYoutubeID(url);
    if (!id) {
      return Promise.reject(new Error('url not valid'));
    }
    const goodURL = `https://www.youtube.com/watch?v=${id}`;
    const requestOptions = {};
    if (platform.isMobile) {
      requestOptions.mode = 'disable-fetch';
    }
    return new Promise((resolve, reject) => {
      try {
        getInfo(goodURL, { requestOptions }, (error, info) => {
          if (error) {
            reject(error);
          } else {
            const isLiveStream = typeof info.livestream === 'string'
              ? JSON.parse(info.livestream)
              : info.livestream;
            if (isLiveStream) {
              reject(new Error('live_video'));
            } else {
              const data = {
                title: info.title,
                length_seconds: parseInt(info.length_seconds, 10),
                thumbnail_url: info.thumbnail_url,
                formats: handleFormats(info.formats),
              };
              resolve(data);
            }
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
