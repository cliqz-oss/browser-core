import lazyLoader from './helpers';

const tldts = lazyLoader('tldts.umd.min.js', 'tldts');

const getDomain = (...args) => tldts.getDomain(...args);
const getHostname = (...args) => tldts.getHostname(...args);
const getPublicSuffix = (...args) => tldts.getPublicSuffix(...args);
const getSubdomain = (...args) => tldts.getSubdomain(...args);
const isValidHostname = (...args) => tldts.isValidHostname(...args);
const parse = (...args) => tldts.parse(...args);

export {
  getDomain,
  getHostname,
  getPublicSuffix,
  getSubdomain,
  isValidHostname,
  parse
};
