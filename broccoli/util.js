var ConfigReplace = require('broccoli-config-replace');

function injectVars(str, config) {
  return str.replace(/\{\{(.*?)\}\}/g, function(i, match) {
    return config[match];
  });
}

module.exports = {
  injectConfig(tree, config, configPath, files) {
    // TODO: metaprogram all settings
    return new ConfigReplace(tree, config, {
      configPath,
      files,
      patterns: [
        {
          match: /\{\{CONFIG\}\}/g,
          replacement: config => JSON.stringify(config)
        },
        {
          match: /\_\_CONFIG\_\_/g,
          replacement: config => JSON.stringify(config)
        },
        {
          match: /\{\{id\}\}/g,
          replacement: config => config.settings.id
        },
        {
          match: /\{\{name\}\}/g,
          replacement: config => config.settings.name
        },
        {
          match: /\{\{codeVersion\}\}/g,
          replacement: config => config.EXTENSION_VERSION
        },
        {
          match: /\{\{rdfUpdateURL\}\}/g,
          replacement: config => {
            if (config.settings.updateURL) {
              var url = config.settings.updateURL;
              url = injectVars(url, config);
              return [
                "<em:updateURL>",
                url,
                "</em:updateURL>",
              ].join("");
            } else {
              return "";
            }
          }
        },
        {
          match: /\{\{rdfHomepageURL\}\}/g,
          replacement: config => config.settings.homepageURL || ''
        },
      ]
    });
  }
};
