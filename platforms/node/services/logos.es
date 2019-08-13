import prefs from '../../core/prefs';
import config from '../../core/config';
import ResourceLoader from '../../core/resource-loader';

function getBrandsDBUrl(version) {
  return `${config.settings.BACKGROUND_IMAGE_URL}${version}/data/database.json`;
}

export default function (BRANDS_DATABASE_VERSION, { updateVersion }) {
  const versionOverride = prefs.get('config_png_logoVersion');
  const dev = prefs.get('config_png_logoVersion');
  let version = BRANDS_DATABASE_VERSION; // default fallback value

  if (dev) {
    version = dev;
  } else if (versionOverride) {
    version = versionOverride;
  }

  updateVersion(version);

  const remoteURL = getBrandsDBUrl(version);

  const loader = new ResourceLoader(
    ['core', 'logo-database.json'],
    {
      remoteURL,
      cron: 24 * 60 * 60 * 1000,
    },
  );
  return loader.load();
}
