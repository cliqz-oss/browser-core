import ResourceLoader from '../core/resource-loader';
import resourceManager from '../core/resource-manager';

const domainInfo = {
  domainOwners: {},
};

function parseDomainOwners(companyList) {
  const revList = {};
  Object.keys(companyList).forEach((company) => {
    companyList[company].forEach((d) => {
      revList[d] = company;
    });
  });
  domainInfo.domainOwners = revList;
}

resourceManager.addResourceLoader(new ResourceLoader(['antitracking', 'tracker_owners.json'], {
  remoteURL: 'https://cdn.cliqz.com/anti-tracking/tracker_owners_list.json',
  cron: 24 * 60 * 60 * 1000,
}), parseDomainOwners);

export default domainInfo;
