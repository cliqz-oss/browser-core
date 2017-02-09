import CliqzADB from 'adblocker/adblocker';

export default function log(msg) {
  const message = `[adblock] ${msg}`;
  if (CliqzADB.adbDebug) {
    dump(`${message}\n`);
  }
}
