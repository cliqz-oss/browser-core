/* global localStorage */
export default function (url) {
  if (url) {
    throw new Error('localStorage for URL is not supported', url);
  }
  return localStorage;
}
