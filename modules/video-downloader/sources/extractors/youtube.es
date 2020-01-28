/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getInfo, { filterFormats } from '../../platform/video-downloader/lib/ytdl-core';
import sanitizeFilename from '../../platform/lib/sanitize-filename';
import platform from '../../platform/platform';
import getYoutubeID from '../utils/get-youtube-id';

function handleFormat(info, title) {
  if (info.container !== 'mp4' && info.container !== 'm4a') {
    return null;
  }

  const mediaClass = info.mimeType.split('/')[0];
  const format = mediaClass === 'audio' ? 'm4a' : info.container;
  const name = mediaClass === 'audio' ? 'Audio' : `${info.container.toUpperCase()} ${info.qualityLabel}`;

  return {
    title,
    url: info.url,
    format,
    name,
    class: mediaClass,
    size: info.contentLength ? (Number(info.contentLength) || 0) : undefined,
  };
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

  static async getVideoInfo(url) {
    const id = getYoutubeID(url);
    if (!id) {
      throw new Error('url not valid');
    }
    const requestOptions = {};
    if (platform.isMobile) {
      requestOptions.mode = 'disable-fetch';
    }

    const info = await getInfo(id, { requestOptions });
    const isLiveStream = typeof info.livestream === 'string'
      ? JSON.parse(info.livestream)
      : info.livestream;

    if (isLiveStream) {
      throw new Error('live_video');
    }

    const title = sanitizeFilename(info.title, { replacement: ' ' }).slice(0, 250);
    const formats = filterFormats(info.formats, 'audioandvideo')
      .concat(filterFormats(info.formats, 'audioonly'));

    return formats.reduce((media, format) => {
      const m = handleFormat(format, title);
      if (m) {
        media.push(m);
      }
      return media;
    }, []);
  }
}
