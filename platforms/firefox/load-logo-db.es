import utils from '../core/utils';
import prefs from '../core/prefs';
import ResourceLoader from '../core/resource-loader';

function getBrandsDBUrl(version) {
  return `https://cdn.cliqz.com/brands-database/database/${version}/data/database.json`;
}

export default function () {
  const config = prefs.get('config_logoVersion');
  const dev = prefs.get('brands-database-version');
  let version = utils.BRANDS_DATABASE_VERSION; // default fallback value

  if (dev) {
    version = dev;
  } else if (config) {
    version = config;
  }

  // use the proper database version for generating logo paths
  //
  utils.BRANDS_DATABASE_VERSION = version;
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
