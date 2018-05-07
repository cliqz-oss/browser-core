const getPolyfills = require('react-native/rn-get-polyfills');

// From https://github.com/webpack/node-libs-browser and https://github.com/parshap/node-libs-react-native
module.exports = {
  extraNodeModules: {
    fs: require.resolve('./_empty'),
    stream: require.resolve('stream-browserify'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    path: require.resolve('path-browserify'),
    buffer: require.resolve('buffer'),
  },
  getPolyfills({ platform }) {
    return [
      require.resolve('core-js/client/shim.js'),
      require.resolve('number-to-locale-string'),
    ].concat(getPolyfills({ platform }));
  },
};
