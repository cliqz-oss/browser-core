import Youtube from './extractors/youtube';

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
      if (item.type.includes('audio/mp4')) {
        audio = {
          name: `M4A ${item.audioBitrate}kbps Audio Only`,
          size: getSize(item.size),
          url: item.url,
          title: info.title,
          format: 'm4a',
          isAudio: true,
        };
      } else if (item.container === 'mp4') {
        const video = {
          name: `${item.container.toUpperCase()} ${item.resolution}`,
          size: getSize(item.size),
          url: item.url,
          title: info.title,
          format: item.container,
        };

        if (item.audioBitrate !== null) {
          video.isVideoAudio = true;
          videos.push(video);
        } else {
          video.isVideoOnly = true;
          video.name = `${video.name} Video Only`;
          video.class = 'hidden';
          videosOnly.push(video);
        }
      }
    });
    videos.push(audio);
    return videos.concat(videosOnly);
  }
  return [];
}

export { isVideoURL, getVideoInfo, getFormats };
