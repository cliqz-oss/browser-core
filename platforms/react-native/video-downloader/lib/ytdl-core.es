export { getInfo as default } from 'ytdl-core';

if (!global.location) {
  global.location = { protocol: 'https://' };
}
