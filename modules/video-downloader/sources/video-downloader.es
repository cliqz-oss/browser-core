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

function getSize(contentLength) {
  let size = parseInt(contentLength, 10);
  if (size >= 1073741824) {
    size = `${parseFloat((size / 1073741824).toFixed(1))} GB`;
  } else if (size >= 1048576) {
    size = `${parseFloat((size / 1048576).toFixed(1))} MB`;
  } else {
    size = `${parseFloat((size / 1024).toFixed(1))} KB`;
  }
  return size;
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

function getSizes(formats) {
  return Promise.all(formats.map((x) => {
    const request = new Request(x.url, { method: 'HEAD' });
    return fetch(request).then(response => response.headers.get('content-length'))
      .then((size) => {
        const _x = x;
        _x.size = getSize(parseInt(size, 10));
        return x;
      });
  }));
}

function getVideoInfo(url) {
  return getRawVideoInfo(url)
    .then(getFormats)
    .then(getSizes);
}

export { isVideoURL, getVideoInfo, getRawVideoInfo };
