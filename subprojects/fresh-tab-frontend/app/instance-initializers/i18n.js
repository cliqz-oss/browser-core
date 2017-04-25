const SUPPORTED_LANGUAGES = ['en', 'fr', 'de'];

function calculateLocale() {
  try {
    const lang = navigator.language || navigator.userLanguage || 'en';
    const preferredLang = lang.split('-')[0].toLowerCase();
    if(SUPPORTED_LANGUAGES.indexOf(preferredLang) != -1){
      return preferredLang;
    } else {
      return 'en'
    }
  } catch(e) {
    // return nothing on error
  }
}

export function initialize(appInstance) {
  const i18n = appInstance.lookup('service:i18n');
  if (!i18n) {
    return;
  }
  const currentLocale = i18n.get('locale');
  const locale = calculateLocale() || 'en';

  if (currentLocale !== locale) {
    i18n.set('locale', locale);
  }
}

export default {
  name: 'i18n',
  initialize
};
