function calculateLocale() {
  try {
    const lang = navigator.language || navigator.userLanguage || 'en-GB';
    return lang.split('-')[0].toLowerCase();
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
