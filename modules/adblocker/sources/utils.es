import CliqzADB from 'adblocker/adblocker';

export function log(msg) {
  const message = `[adblock] ${msg}`;
  if (CliqzADB.adbDebug) {
    dump(`${message}\n`);
  }
}
