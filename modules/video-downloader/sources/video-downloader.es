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

export { isVideoURL, getVideoInfo };
