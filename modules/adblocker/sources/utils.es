// import CliqzADB from '../adblocker/adblocker';

const debug = false;

export default function log(msg) {
  const message = `[adblock] ${msg}`;
  if (debug) {
    dump(`${message}\n`);
  }
}
