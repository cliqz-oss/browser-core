module.exports = function getOptionsUrl() {
  // Special data url to pass options
  return `data:text/plain,${JSON.stringify({
    grep: process.env.MOCHA_GREP || '',
    autostart: process.env.AUTOSTART || 'false',
  })}`;
};
