import getInfo from 'ytdl-core/lib/info';

if (!global.location) {
  global.location = { protocol: 'https://' };
}

export default getInfo;
