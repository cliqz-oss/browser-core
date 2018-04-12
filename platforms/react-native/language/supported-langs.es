const SUPPORTED_LANGS = ['de', 'fr', 'es', 'pt', 'pl', 'ru', 'it', 'en'];

export default function (lang) {
  if (SUPPORTED_LANGS.indexOf(lang) !== -1) {
    return lang;
  }

  return 'en';
}
