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
        {
          match: /\{\{ENDPOINT_BLIND_SIGNER\}\}/g,
          replacement: config => config.settings.ENDPOINT_BLIND_SIGNER || ''
        },
        {
          match: /\{\{ENDPOINT_USER_REG\}\}/g,
          replacement: config => config.settings.ENDPOINT_USER_REG || ''
        },
        {
          match: /\{\{ENDPOINT_SOURCE_MAP_PROVIDER\}\}/g,
          replacement: config => config.settings.ENDPOINT_SOURCE_MAP_PROVIDER || ''
        },
        {
          match: /\{\{ENDPOINT_LOOKUP_TABLE_PROVIDER\}\}/g,
          replacement: config => config.settings.ENDPOINT_LOOKUP_TABLE_PROVIDER || ''
        },
        {
          match: /\{\{ENDPOINT_KEYS_PROVIDER\}\}/g,
          replacement: config => config.settings.ENDPOINT_KEYS_PROVIDER || ''
        },
        {
          match: /\{\{ENDPOINT_PROXY_LIST_PROVIDER\}\}/g,
          replacement: config => config.settings.ENDPOINT_PROXY_LIST_PROVIDER || ''
        },
        {
          match: /\{\{ENDPOINT_PATTERNSURL\}\}/g,
          replacement: config => config.settings.ENDPOINT_PATTERNSURL || ''
        },
        {
          match: /\{\{ENDPOINT_ANONPATTERNSURL\}\}/g,
          replacement: config => config.settings.ENDPOINT_ANONPATTERNSURL || ''
        },
        {
          match: /\{\{ENDPOINT_CONFIGURL\}\}/g,
          replacement: config => config.settings.ENDPOINT_CONFIGURL || ''
        },
        {
          match: /\{\{ENDPOINT_SAFE_QUORUM_ENDPOINT\}\}/g,
          replacement: config => config.settings.ENDPOINT_SAFE_QUORUM_ENDPOINT || ''
        },
        {
          match: /\{\{ENDPOINT_SAFE_QUORUM_PROVIDER\}\}/g,
          replacement: config => config.settings.ENDPOINT_SAFE_QUORUM_PROVIDER || ''
        },
        {
          match: /\{\{MSGCHANNEL\}\}/g,
          replacement: config => config.settings.MSGCHANNEL || ''
        },
        {
          match: /\{\{KEY_DS_PUBKEY\}\}/g,
          replacement: config => config.settings.KEY_DS_PUBKEY || ''
        },
        {
          match: /\{\{KEY_SECURE_LOGGER_PUBKEY\}\}/g,
          replacement: config => config.settings.KEY_SECURE_LOGGER_PUBKEY || ''
        },
        {
          match: /\{\{HW_CHANNEL\}\}/g,
          replacement: config => config.settings.HW_CHANNEL || ''
        }
      ]
    });
  }
};
