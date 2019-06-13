const fs = require('fs');

const writeFile = require('broccoli-file-creator');
const MergeTrees = require('broccoli-merge-trees');

const config = require('../config');

/**
 * Collect locales from all modules included in the config and bundle them into
 * one big file. It also takes care to fall-back to english translations if none
 * is provided for one or more languages.
 */

const DEFAULT_LANGUAGE = 'en';
const LANGUAGES = [
  // Default locale needs to be first
  'en',

  // Other locales
  'de',
  'es',
  'fr',
  'it',
  'pl',
  'pt',
  'ru',
];

/**
 * Return values which are in `values1` but not in `values2`
 */
function difference(values1, values2) {
  const set2 = new Set(values2);

  const diff = new Set();
  values1.forEach((value) => {
    if (!set2.has(value)) {
      diff.add(value);
    }
  });

  return [...diff];
}

/**
 * Assert that there are no keys in `moduleLocale`
 * which already exist in `locale` with different message.
 */
function assertIntersectionIsEmpty(locale, module, moduleLocale) {
  const keys = Object.keys(locale || {});
  const moduleKeys = Object.keys(moduleLocale || {});
  const existingKeys = new Set(keys);
  moduleKeys.forEach((key) => {
    if (existingKeys.has(key) && locale[key].message !== moduleLocale[key].message) {
      throw new Error(`Module ${module} specifies key '${key}' which was already defined with different message`);
    }
  });
}

/**
 * Make sure that `messages` contains the same keys as `keys` (which would be
 * the ones specified in the DEFAULT_LANGUAGE file). If we find inconsistencies,
 * raise an exception explaining what's missing.
 */
function assertMessagesHaveKeys(moduleName, lang, keys, messages) {
  const messagesKeys = Object.keys(messages);
  if (keys.length !== messagesKeys.length) {
    const missing = difference(keys, messagesKeys);
    const extra = difference(messagesKeys, keys);
    throw new Error(
      `Module ${moduleName} does not have same keys for ${lang}: ${JSON.stringify(
        {
          missing: missing.length === 0 ? undefined : missing,
          extra: extra.length === 0 ? undefined : extra,
        },
        null,
        4,
      )}`,
    );
  }

  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] !== messagesKeys[i]) {
      throw new Error(
        `Module ${moduleName} does not have same keys for ${lang}: ${JSON.stringify(
          {
            pos: i,
            expected: keys[i],
            got: messagesKeys[i],
          },
          null,
          4,
        )}`,
      );
    }
  }
}

/**
 * Custom message key comparison function, make sure that we are not sensitive
 * to case (upper/lower case).
 */
function compareMessageKeys(a, b) {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower < bLower) {
    return -1;
  }
  if (aLower > bLower) {
    return 1;
  }
  return 0;
}

/**
 * Given one `messages.json` file content (as an object), format it to be
 * consistent: sort keys and dump with correct indentation.
 */
function formatLocales(messages) {
  const sorted = {};

  Object.keys(messages)
    .sort(compareMessageKeys)
    .forEach((key) => {
      sorted[key] = messages[key];
    });

  return JSON.stringify(sorted, null, 4);
}

module.exports = (() => {
  const LOCALES = {};

  if (config.modules) {
    config.modules.forEach((moduleName) => {
      const localeDir = `./modules/${moduleName}/dist/locale`;
      if (!fs.existsSync(localeDir)) {
        return;
      }

      const locales = {};
      LANGUAGES.forEach((lang) => {
        const pathToLocale = `${localeDir}/${lang}/messages.json`;
        if (fs.existsSync(pathToLocale)) {
          console.log(`Loading locale for ${moduleName}: ${lang}`);
          locales[lang] = JSON.parse(fs.readFileSync(pathToLocale));
        } else {
          if (locales[DEFAULT_LANGUAGE] === undefined) {
            throw new Error(
              `Module ${moduleName} does not provide ${DEFAULT_LANGUAGE} locale file`,
            );
          }

          // Un-specified locales default to DEFAULT_LANGUAGE
          locales[lang] = locales[DEFAULT_LANGUAGE];
        }
      });

      // Make sure that all locales provided by this module have the same keys
      // and they all contain 'message'
      const expectedKeys = Object.keys(locales[DEFAULT_LANGUAGE]).sort(compareMessageKeys);
      Object.entries(locales).forEach(([lang, messages]) => {
        Object.entries(messages).forEach(([key, message]) => {
          if (message.message === undefined) {
            throw new Error(
              `Key ${key} in module ${moduleName} for language ${lang} does not contain 'message'`,
            );
          }
        });
        assertMessagesHaveKeys(moduleName, lang, expectedKeys, messages);
      });

      // Merge locales from all modules together + format
      LANGUAGES.forEach((lang) => {
        assertIntersectionIsEmpty(
          LOCALES[lang],
          moduleName,
          locales[lang],
        );
        LOCALES[lang] = {
          ...(LOCALES[lang] || {}),
          ...locales[lang],
        };
      });
    });
  }

  return new MergeTrees(
    LANGUAGES.map(lang => writeFile(`_locales/${lang}/messages.json`, formatLocales(LOCALES[lang] || {}))),
  );
})();
