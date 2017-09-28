import { mobilePlatformName } from '../platform';

const SUPPORTED_LANGS_IOS = ['de', 'en', 'fr', 'it'];
const SUPPORTED_LANGS_ANDROID = ['de', 'en', 'fr', 'es', 'pl', 'pt', 'ru', 'it'];
const SUPPORTED_LANGS = mobilePlatformName === 'ios' ? SUPPORTED_LANGS_IOS : SUPPORTED_LANGS_ANDROID;

export default function (lang) {
  if (SUPPORTED_LANGS.indexOf(lang) !== -1) {
    return lang;
  }

  return 'en';
};