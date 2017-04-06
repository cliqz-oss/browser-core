// From https://github.com/regexhq/youtube-regex/blob/master/index.js
const regex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g;

export default function (url) {
  const match = regex.exec(url);
  regex.lastIndex = 0;
  if (match) {
    return match[1];
  }
  return null;
}
