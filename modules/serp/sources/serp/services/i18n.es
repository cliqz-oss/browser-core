import i18n from './translations';

const defaultLang = 'de';
export default (token, lang) => {
  const res = i18n[lang]
    ? i18n[lang][token]
    : i18n[defaultLang][token];

  return res;
};
