import config from './config';

function getValues(obj = {}) {
  return Object.keys(obj).map(key => obj[key]);
}

export function getWallpapers(product = 'CLIQZ') {
  return getValues(config.backgrounds[product]);
}

export function getDefaultWallpaper(product) {
  const defaults = getWallpapers(product).filter(w => w.isDefault);

  if (defaults.length === 0) {
    throw new Error('No default wallpaper specified');
  }

  if (defaults.length > 1) {
    throw new Error('Multiple default wallpaper specified');
  }

  return defaults[0].name;
}
