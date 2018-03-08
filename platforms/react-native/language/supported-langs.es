const SUPPORTED_LANGS = ['de', 'en', 'fr'];

export default function (lang) {
  if (SUPPORTED_LANGS.indexOf(lang) !== -1) {
    return lang;
  }

  return 'en';
};