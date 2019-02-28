/**
 * This script can be used to format locales files. It will perform the
 * following:
 * 1. Make sure that all keys are sorted
 * 2. Fix indentation to 4 spaces
 */
const fs = require('fs');

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

function formatLocales(content) {
  const messages = JSON.parse(content);
  const sorted = {};

  Object.keys(messages)
    .sort(compareMessageKeys)
    .forEach((key) => {
      sorted[key] = messages[key];
    });

  return JSON.stringify(sorted, null, 4);
}

if (require.main === module) {
  [
    './__hu/messages.json',
    './de/messages.json',
    './en/messages.json',
    './es/messages.json',
    './fr/messages.json',
    './it/messages.json',
    './pl/messages.json',
    './pt/messages.json',
    './ru/messages.json',
  ].forEach((path) => {
    // eslint-disable-next-line no-console
    console.log(`Formatting ${path}`);
    fs.writeFileSync(path, formatLocales(fs.readFileSync(path, { encoding: 'utf-8' })), {
      encoding: 'utf-8',
    });
  });
}

module.exports = formatLocales;
