import Youtube from './extractors/youtube';
import sanitizeFilename from '../platform/lib/sanitize-filename';

const EXTRACTORS = [
  Youtube,
];

function isVideoURL(url) {
  return EXTRACTORS.some(x => x.isVideoURL(url));
}

function getVideoInfo(url) {
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
    const videosOnly = [];
    info.formats.forEach((item) => {
      if (item.size === 0) {
        return;
      }
      if (item.container === 'm4a' || item.container === 'mp4') {
        const media = {
          size: getSize(item.size),
          url: item.url,
          title: sanitizeFilename(info.title, { replacement: ' ' }).slice(0, 250),
          format: item.container,
        };
        if (item.container === 'm4a') {
          media.name = `M4A ${item.audioBitrate}kbps Audio Only`;
          media.isAudio = true;
          audio = media;
        } else {
          media.name = `${item.container.toUpperCase()} ${item.resolution}`;
          if (item.audioBitrate !== null) {
            media.isVideoAudio = true;
            videos.push(media);
          } else {
            media.isVideoOnly = true;
            media.name = `${media.name} Video Only`;
            media.class = 'hidden';
            videosOnly.push(media);
          }
        }
      }
    });
    if (audio) {
      videos.push(audio);
    }
    return videos.concat(videosOnly);
  }
  return [];
}

export { isVideoURL, getVideoInfo, getFormats };
