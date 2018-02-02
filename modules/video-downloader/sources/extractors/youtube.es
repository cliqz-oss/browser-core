import getInfo from '../../platform/video-downloader/lib/ytdl-core';
import getYoutubeID from '../utils/get-youtube-id';


// This takes a bit, not perfect... Will it be blocked if too much traffic?
function handleFormats(formats) {
  const promises = formats.map((x) => {
    if (x.clen) {
      return Promise.resolve(x.clen);
    }
    const request = new Request(x.url, { method: 'HEAD' });
    return fetch(request).then(response => response.headers.get('content-length'));
  });
  return Promise.all(promises).then(results =>
    results.map((size, i) => {
      const data = formats[i];
      const keys = [
        'audioBitrate',
        'audioEncoding',
        'container',
        'encoding',
        'resolution',
        'url',
      ];
      const output = {};
      keys.forEach((x) => { output[x] = data[x]; });
      output.size = parseInt(size, 10);
      return output;
    })
      .filter(x => x.container === 'm4a' || (x.resolution && x.container)),
  );
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
    return new Promise((resolve, reject) => {
      try {
        getInfo(goodURL, (error, info) => {
          if (error) {
            reject(error);
          } else {
            const isLiveStream = typeof info.livestream === 'string' ?
              JSON.parse(info.livestream) : info.livestream;
            if (isLiveStream) {
              reject(new Error('cannot download livestreams'));
            } else {
              handleFormats(info.formats)
                .then((formats) => {
                  const data = {
                    title: info.title,
                    length_seconds: parseInt(info.length_seconds, 10),
                    thumbnail_url: info.thumbnail_url,
                    formats,
                  };
                  resolve(data);
                })
                .catch(e => reject(e));
            }
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
