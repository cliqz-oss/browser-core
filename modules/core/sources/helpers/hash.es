/* eslint no-bitwise: off */

export default function hash(s) {
  return s.split('').reduce((a, b) => (((a << 4) - a) + b.charCodeAt(0)) & 0xEFFFFFF, 0);
}
