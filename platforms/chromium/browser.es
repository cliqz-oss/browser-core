export class Window {
  constructor(window) {
  }
}

export function mapWindows() {
  return [];
}


export function isTabURL() {
  return false;
}


export function getBrowserMajorVersion() {
  const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  return raw ? parseInt(raw[2], 10) : false;
}
