import { chrome } from './globals';

export const loadTranslation = () => {};
export const locale = {};
export const LOCALE_PATH = null;
export const IMPLEMENTS_GET_MESSAGE = true;
export const getMessage = (key = '', sub) => chrome.i18n.getMessage(key, sub);
export const SUPPORTED_LANGS = ['de', 'en', 'fr'];
