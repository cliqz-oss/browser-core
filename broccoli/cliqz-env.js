const env = (process.env.CLIQZ_ENVIRONMENT || 'development').toUpperCase();
const IS_BETA = process.env.CLIQZ_BETA === 'True';

module.exports = {
  [env]: true,
  IS_BETA,
  INCLUDE_TESTS: process.env.CLIQZ_INCLUDE_TESTS || env === 'TESTING',
};
