
const LD = 'a-z0-9';
const LDH = `${LD}-_`; // technically underscore cannot be the part of hostname

export const UrlRegExp = /^(([a-z\d]([a-z\d-]*[a-z\d])?)\.)+[a-z]{2,}(:\d+)?$/i;

export const LocalUrlRegExp = new RegExp([
  `(^[${LD}][${LDH}]{0,61}[${LD}])`, // mandatory ascii hostname
  '(:\\d{1,5})$', // mandatory port
].join(''), 'i');
