const env = (process.env.CLIQZ_ENVIRONMENT || 'development').toUpperCase();

module.exports = {
  [env]: true,
  INCLUDE_TESTS: process.env.CLIQZ_INCLUDE_TESTS || env === 'TESTING',
};
