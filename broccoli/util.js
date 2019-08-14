const ConfigReplace = require('broccoli-config-replace');

function injectconsts(str, config) {
  return str.replace(/\{\{(.*?)\}\}/g, (i, match) => config[match]);
}

function updateUrl(url, config) {
  if (url) {
    return [
      '<em:updateURL>',
      injectconsts(url, config),
      '</em:updateURL>',
    ].join('');
  }
  return '';
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
          replacement: JSON.stringify,
        },
        {
          match: /__CONFIG__/g,
          replacement: JSON.stringify,
        },
        {
          match: /\{\{id\}\}/g,
          replacement: ({ settings: { id } }) => id,
        },
        {
          match: /\{\{key\}\}/g,
          replacement: ({ key }) => key,
        },
        {
          match: /\{\{description\}\}/g,
          replacement: ({ settings: { description } }) => description,
        },
        {
          match: /\{\{name\}\}/g,
          replacement: ({ settings: { name } }) => name,
        },
        {
          match: /\{\{timestamp\}\}/g,
          replacement: () => now,
        },
        {
          match: /\{\{codeVersion\}\}/g,
          replacement: ({ EXTENSION_VERSION }) => EXTENSION_VERSION,
        },
        {
          match: /\{\{version\}\}/g,
          replacement: ({ VERSION }) => VERSION,
        },
        {
          match: /\{\{artifactUrl\}\}/g,
          replacement: ({ artifactUrl }) => artifactUrl,
        },
        {
          match: /\{\{updateUrl\}\}/g,
          replacement: _config => (process.env.CLIQZ_BETA === 'True' ? _config.updateURLbeta : _config.updateURL),
        },
        {
          match: /\{\{rdfUpdateURL\}\}/g,
          replacement: (_config) => { updateUrl(_config.updateURL, _config); }
        },
        {
          match: /\{\{rdfUpdateURLbeta\}\}/g,
          replacement: (_config) => { updateUrl(_config.updateURLbeta, _config); }
        },
        {
          match: /\{\{rdfHomepageURL\}\}/g,
          replacement: ({ settings: { homepageURL } }) => homepageURL || ''
        },
        {
          match: /\{\{ENDPOINT_PATTERNSURL\}\}/g,
          replacement: ({ settings: { ENDPOINT_PATTERNSURL } }) => ENDPOINT_PATTERNSURL || ''
        },
        {
          match: /\{\{ENDPOINT_ANONPATTERNSURL\}\}/g,
          replacement: ({ settings: { ENDPOINT_ANONPATTERNSURL } }) => ENDPOINT_ANONPATTERNSURL || ''
        },
        {
          match: /\{\{ENDPOINT_SAFE_QUORUM_ENDPOINT\}\}/g,
          replacement: ({ settings: { ENDPOINT_SAFE_QUORUM_ENDPOINT } }) => ENDPOINT_SAFE_QUORUM_ENDPOINT || ''
        },
        {
          match: /\{\{ENDPOINT_SAFE_QUORUM_PROVIDER\}\}/g,
          replacement: ({ settings: { ENDPOINT_SAFE_QUORUM_PROVIDER } }) => ENDPOINT_SAFE_QUORUM_PROVIDER || ''
        },
        {
          match: /\{\{MSGCHANNEL\}\}/g,
          replacement: ({ settings: { MSGCHANNEL } }) => MSGCHANNEL || ''
        },
        {
          match: /\{\{HW_CHANNEL\}\}/g,
          replacement: ({ settings: { HW_CHANNEL } }) => HW_CHANNEL || ''
        },
        {
          match: /\{\{CONFIG_PROVIDER\}\}/g,
          replacement: ({ settings: { CONFIG_PROVIDER } }) => CONFIG_PROVIDER || ''
        },
        {
          match: /\{\{FRESHTAB_TITLE\}\}/g,
          replacement: ({ settings: { FRESHTAB_TITLE } }) => FRESHTAB_TITLE || ''
        },
        {
          match: /\{\{CUSTOM_MANIFEST_ENTRY\}\}/g,
          replacement: ({ CUSTOM_MANIFEST_ENTRY }) => CUSTOM_MANIFEST_ENTRY || ''
        },
        {
          match: /\{\{CUSTOM_MANIFEST_PAGE_ACTION_POPUP\}\}/g,
          replacement: ({ CUSTOM_MANIFEST_PAGE_ACTION_POPUP }) => CUSTOM_MANIFEST_PAGE_ACTION_POPUP || ''
        },
        {
          match: /\{\{CUSTOM_MANIFEST_PERMISSIONS\}\}/g,
          replacement: ({ CUSTOM_MANIFEST_PERMISSIONS }) => CUSTOM_MANIFEST_PERMISSIONS || ''
        },
        {
          match: /\{\{QUICK_SEARCH_TOGGLE\}\}/g,
          replacement: ({ QUICK_SEARCH_TOGGLE }) => QUICK_SEARCH_TOGGLE || ''
        },
        {
          match: /\{\{OFFERS_PRODUCT_PREFIX\}\}/g,
          replacement: ({ OFFERS_PRODUCT_PREFIX }) => OFFERS_PRODUCT_PREFIX || ''
        },
        {
          match: /\{\{OFFERS_PRODUCT_TITLE\}\}/g,
          replacement: ({ OFFERS_PRODUCT_TITLE }) => OFFERS_PRODUCT_TITLE || ''
        },
      ]
    });
  }
};
