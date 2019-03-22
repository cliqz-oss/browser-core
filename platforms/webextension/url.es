
const LD = 'a-z0-9';
const ULD = `${LD}\\u{00c0}-\\u{ffff}`;
const LDH = `${LD}-_`; // technically underscore cannot be the part of hostname
const ULDH = `${ULD}-_`; // but it is being used too often to ignore it

export const UrlRegExp = new RegExp([
  `^(?:[${ULDH}]{1,63}\\.)*`, // optional subdomains
  `((?:[${ULD}][${ULDH}]{0,61}[${ULD}])|`,
  `(?:[${ULD}]))\\.`, // mandatory hostname
  `([${ULD}]{2,63})`, // mandatory TLD
  '(?:(?::(\\d{1,5}))|\\.)?$', // optional port or dot
].join(''), 'iu');

export const LocalUrlRegExp = new RegExp([
  `(^[${LD}][${LDH}]{0,61}[${LD}])`, // mandatory ascii hostname
  '(:\\d{1,5})$', // mandatory port
].join(''), 'i');
