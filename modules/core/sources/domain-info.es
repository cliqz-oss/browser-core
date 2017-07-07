import ResourceLoader from '../core/resource-loader';
import resourceManager from '../core/resource-manager';

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
    revList[domain] = apps[bugs[domains[domain]]].name;
  });

  domainInfo.domainOwners = revList;
}

resourceManager.addResourceLoader(new ResourceLoader(['antitracking', 'tracker_db.json'], {
  remoteURL: 'https://cdn.cliqz.com/anti-tracking/tracker_db.json',
  cron: 24 * 60 * 60 * 1000,
}), parseDomainOwners);

export default domainInfo;
