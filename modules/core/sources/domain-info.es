import ResourceLoader from '../core/resource-loader';
import resourceManager from '../core/resource-manager';
import psl from '../core/tlds';

const domainInfo = {
  domainOwners: {},
  apps: {},
  bugs: {},
  domains: {},
};

function parseDomainOwners(companyList) {
  const { apps, bugs, domains } = companyList;
  domainInfo.apps = apps;
  domainInfo.bugs = bugs;
  domainInfo.domains = domains;

  const revList = {};
  Object.keys(domains).forEach((domain) => {
    revList[domain] = apps[domains[domain]].name;
  });

  domainInfo.domainOwners = revList;
}

resourceManager.addResourceLoader(new ResourceLoader(['antitracking', 'tracker_db_v2.json'], {
  remoteURL: 'https://cdn.cliqz.com/anti-tracking/tracker_db_v2.json',
  cron: 24 * 60 * 60 * 1000,
}), parseDomainOwners);

export function getAppOwner(appId) {
  return domainInfo.apps[appId] || { name: 'Unknown', cat: 'unknown' };
}

export function getBugOwner(bugId) {
  const appId = domainInfo.bugs[bugId];
  return getAppOwner(appId);
}

function _getDomainOwner(dom) {
  if (dom in domainInfo.domains) {
    return domainInfo.apps[domainInfo.domains[dom]];
  }
  if (dom.indexOf('.') === -1) {
    return false;
  }
  return _getDomainOwner(dom.substring(dom.indexOf('.') + 1));
}

export function getDomainOwner(dom) {
  return _getDomainOwner(dom) || {
    name: psl.getGeneralDomain(dom),
    cat: 'unknown',
  };
}

export default domainInfo;
