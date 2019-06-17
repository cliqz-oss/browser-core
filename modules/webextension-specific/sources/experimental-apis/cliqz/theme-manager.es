const addonManager = ChromeUtils.import('resource://gre/modules/AddonManager.jsm', {}).AddonManager; // eslint-disable-line no-undef

export async function setTheme(currentThemeId) {
  const themes = await addonManager.getAddonsByTypes(['theme']);

  if (themes.length === 0) {
    throw new Error('No themes found');
  } else {
    const newTheme = themes.filter(theme => theme.id === currentThemeId);
    if (newTheme.length !== 1) {
      throw new Error(`Incorrect number of active themes: ${newTheme.length}`);
    }
    newTheme[0].enable();
  }
}

export async function getTheme() {
  const themes = await addonManager.getAddonsByTypes(['theme']);
  let currentTheme = '';

  if (themes.length === 0) {
    throw new Error('No themes found');
  } else {
    const activeTheme = themes.filter(theme => theme.isActive);
    if (activeTheme.length !== 1) {
      throw new Error(`Incorrect number of active themes: ${activeTheme.length}`);
    }

    if (activeTheme[0].id.indexOf('dark') !== -1) {
      currentTheme = 'dark';
    }
    if (activeTheme[0].id.indexOf('light') !== -1) {
      currentTheme = 'light';
    }

    return currentTheme;
  }
}
