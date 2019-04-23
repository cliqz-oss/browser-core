/* global Components */
const themeManager = ChromeUtils.import('resource://gre/modules/LightweightThemeManager.jsm', {}).LightweightThemeManager; // eslint-disable-line no-undef

export async function setTheme(themeId) {
  const obj = themeManager.getUsedTheme(themeId);
  if (obj === null) {
    throw new Error('themeManager.getUsedTheme returned null');
  } else {
    themeManager.currentTheme = obj;
    Services.obs.notifyObservers(null, 'lightweight-theme-changed');
  }
}

export async function getTheme() {
  if (themeManager.currentTheme.id && themeManager.currentTheme.id.indexOf('dark') !== -1) {
    return 'dark';
  }
  if (themeManager.currentTheme.id && themeManager.currentTheme.id.indexOf('light') !== -1) {
    return 'light';
  }
  return undefined;
}
