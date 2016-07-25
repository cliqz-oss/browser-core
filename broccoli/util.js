var ConfigReplace = require('broccoli-config-replace');

module.exports = {
  injectConfig(tree, config, configPath, files) {
    return new ConfigReplace(tree, config, {
      configPath,
      files,
      patterns: [{
      match: /\{\{CONFIG\}\}/g,
        replacement: config => JSON.stringify(config)
      },{
        match: /\_\_CONFIG\_\_/g,
        replacement: config => JSON.stringify(config)
      }]
    });
  }
};
