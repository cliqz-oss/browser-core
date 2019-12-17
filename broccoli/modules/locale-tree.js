/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
* Assert that there are no keys in locales to be merged
* which already exist in merged locales with different message.
*/
function assertIntersectionIsEmpty(mergedLocales, localesToMerge) {
  const keys = Object.keys(mergedLocales || {});
  const moduleKeys = Object.keys(localesToMerge || {});
  const existingKeys = new Set(keys);
  moduleKeys.forEach((key) => {
    if (existingKeys.has(key) && mergedLocales[key].message !== localesToMerge[key].message) {
      throw new Error(`One of the modules tries to specify key '${key}' which was already defined.`);
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

function loadLocales({ dir, localeDir }) {
  const logMsg = localeDir.includes(`/${config.specific}/`)
    ? `specific (${config.specific})`
    : `module ${dir}`;
  const loadedLocales = {};
  const hasLocale = fs.existsSync(localeDir);

  if (hasLocale) {
    LANGUAGES.forEach((lang) => {
      const pathToLocale = `${localeDir}/${lang}/messages.json`;
      if (fs.existsSync(pathToLocale)) {
        loadedLocales[lang] = JSON.parse(fs.readFileSync(pathToLocale));
      } else {
        if (
          (loadedLocales[DEFAULT_LANGUAGE] === undefined)
          && hasLocale // do not force locales in "specific" subfolders
        ) {
          throw new Error(
            `${logMsg} does not provide ${DEFAULT_LANGUAGE} locale file`,
          );
        }

        // Un-specified locales default to DEFAULT_LANGUAGE
        loadedLocales[lang] = loadedLocales[DEFAULT_LANGUAGE];
      }
    });

    // Make sure that all locales have the same keys
    // and they all contain 'message'
    const expectedKeys = Object.keys(loadedLocales[DEFAULT_LANGUAGE]).sort(compareMessageKeys);
    Object.entries(loadedLocales).forEach(([lang, messages]) => {
      Object.entries(messages).forEach(([key, message]) => {
        if (message.message === undefined) {
          throw new Error(
            `Key ${key} in ${logMsg} for language ${lang} does not contain 'message'`,
          );
        }
      });
      assertMessagesHaveKeys(dir, lang, expectedKeys, messages);
    });
  }

  return loadedLocales;
}

function mergeLocales({ LOCALES, localesToMerge }) {
  const mergedLocales = LOCALES;

  LANGUAGES.forEach((lang) => {
    assertIntersectionIsEmpty(
      mergedLocales[lang],
      localesToMerge[lang],
    );
    mergedLocales[lang] = {
      ...(mergedLocales[lang] || {}),
      ...localesToMerge[lang],
    };
  });

  return mergedLocales;
}

module.exports = (() => {
  let localeDir;
  let modulesLocales = {};
  let specificLocale = {};
  let LOCALES = {};

  if (config.specific) {
    localeDir = `./specific/${config.specific}/locale`;
    specificLocale = loadLocales({ dir: config.specific, localeDir });
  }

  if (config.modules) {
    config.modules.forEach((moduleName) => {
      localeDir = `./modules/${moduleName}/dist/locale`;
      if (!fs.existsSync(localeDir)) {
        return;
      }

      modulesLocales = loadLocales({ dir: moduleName, localeDir });

      // Merge locales from all modules
      LOCALES = mergeLocales({ LOCALES, localesToMerge: modulesLocales });
    });
  }

  // Merge locales from modules and specific
  LOCALES = mergeLocales({ LOCALES, localesToMerge: specificLocale });

  // the output must have only the `SUPPORTED_LANGS` from config
  // but we should keep all the previous steps in place to ensure
  // that all the locale files are in sync and compatible for
  // all the configs
  let supportedLangs = config.settings.SUPPORTED_LANGS || LANGUAGES;
  return new MergeTrees(
    supportedLangs.map(lang => writeFile(`_locales/${lang}/messages.json`, formatLocales(LOCALES[lang] || {}))),
  );
})();
