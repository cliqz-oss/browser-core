var ConfigReplace = require('broccoli-config-replace');

function injectVars(str, config) {
  return str.replace(/\{\{(.*?)\}\}/g, function(i, match) {
    return config[match];
  });
}

const now = Date.now();

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
          match: /\{\{key\}\}/g,
          replacement: config => config.key,
        },
        {
          match: /\{\{description\}\}/g,
          replacement: config => config.settings.description
        },
        {
          match: /\{\{name\}\}/g,
          replacement: config => config.settings.name
        },
        {
          match: /\{\{timestamp\}\}/g,
          replacement: config => now,
        },
        {
          match: /\{\{codeVersion\}\}/g,
          replacement: config => config.EXTENSION_VERSION
        },
        {
          match: /\{\{version\}\}/g,
          replacement: config => config.VERSION
        },
        {
          match: /\{\{artifactUrl\}\}/g,
          replacement: config => config.artifactUrl
        },
        {
          match: /\{\{updateUrl\}\}/g,
          replacement: config => process.env['CLIQZ_BETA'] === 'True' ? config.updateURLbeta : config.updateURL,
        },
        {
          match: /\{\{rdfUpdateURL\}\}/g,
          replacement: config => {
            if (config.updateURL) {
              var url = config.updateURL;
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
          match: /\{\{rdfUpdateURLbeta\}\}/g,
          replacement: config => {
            if (config.updateURLbeta) {
              var url = config.updateURLbeta;
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
          match: /\{\{ENDPOINT_PATTERNSURL\}\}/g,
          replacement: config => config.settings.ENDPOINT_PATTERNSURL || ''
        },
        {
          match: /\{\{ENDPOINT_ANONPATTERNSURL\}\}/g,
          replacement: config => config.settings.ENDPOINT_ANONPATTERNSURL || ''
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
          match: /\{\{HW_CHANNEL\}\}/g,
          replacement: config => config.settings.HW_CHANNEL || ''
        },
        {
          match: /\{\{CONFIG_PROVIDER\}\}/g,
          replacement: config => config.settings.CONFIG_PROVIDER || ''
        },
        {
          match: /\{\{FRESHTAB_TITLE\}\}/g,
          replacement: config => config.settings.FRESHTAB_TITLE || ''
        },
        {
          match: /\{\{CUSTOM_MANIFEST_ENTRY\}\}/g,
          replacement: config => config.CUSTOM_MANIFEST_ENTRY || ''
        },
        {
          match: /\{\{CUSTOM_MANIFEST_PAGE_ACTION_POPUP\}\}/g,
          replacement: config => config.CUSTOM_MANIFEST_PAGE_ACTION_POPUP || ''
        },
        {
          match: /\{\{CUSTOM_MANIFEST_PERMISSIONS\}\}/g,
          replacement: config => config.CUSTOM_MANIFEST_PERMISSIONS || ''
        },
        {
          match: /\{\{QUICK_SEARCH_TOGGLE\}\}/g,
          replacement: config => config.QUICK_SEARCH_TOGGLE || ''
        },
        {
          match: /\{\{OFFERS_PRODUCT_PREFIX\}\}/g,
          replacement: config => config.OFFERS_PRODUCT_PREFIX || ''
        },
        {
          match: /\{\{OFFERS_PRODUCT_TITLE\}\}/g,
          replacement: config => config.OFFERS_PRODUCT_TITLE || ''
        },
      ]
    });
  }
};
