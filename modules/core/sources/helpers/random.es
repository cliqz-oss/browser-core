import random from '../crypto/random';

// creates a random 'len' long string from the input space
export default function rand(len, _space) {
  let ret = '';
  let i;
  const space = _space || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const sLen = space.length;

  for (i = 0; i < len; i += 1) {
    ret += space.charAt(Math.floor(random() * sLen));
  }

  return ret;
}
