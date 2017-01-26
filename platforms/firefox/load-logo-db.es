import utils from "core/utils";
import prefs from "core/prefs";

function getBrandsDBUrl(version) {
  return 'https://cdn.cliqz.com/brands-database/database/' + version + '/data/database.json';
}

const MINUTE = 60*1e3;

export default function () {
  const config = prefs.get("config_logoVersion");
  const dev = prefs.get("brands-database-version");
  const retryPattern = [60*MINUTE, 10*MINUTE, 5*MINUTE, 2*MINUTE, MINUTE, MINUTE/2];
  let version = '1481799943898'; //default fallback value

  if (dev) {
    version = dev;
  } else if (config) {
    version = config;
  }

  // use the proper database version for generating logo paths
  utils.BRANDS_DATABASE_VERSION = version;

  return new Promise((resolve, reject) => {
    function get() {
      utils.httpGet(getBrandsDBUrl(version), req => {
        const logos = JSON.parse(req.response);
        resolve(logos);
      }, () => {
        const retry = retryPattern.pop();
        if(retry) {
          utils.setTimeout(get, retry)
        } else {
          reject();
        }
      });
    }
    get();
  });
};
