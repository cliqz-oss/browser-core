export default class {
  enhanceResults(data) {
    for(var i in data.external_links) {
      data.external_links[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.external_links[i].url));
    }

    if( data.richData && data.richData.additional_sources) {
      for(var i in data.richData.additional_sources) {
        data.richData.additional_sources[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.richData.additional_sources[i].url));
      }
    }

    for(var i in data.news) {
      data.news[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.news[i].url));
    }

    if(data.actions && data.external_links) {
      data.actionsExternalMixed = data.actions.concat(data.external_links);
      data.actionsExternalMixed.sort(function(a,b) {
        if (a.rank < b.rank) {return 1;}
        if (a.rank > b.rank) {return -1;}
        return 0;
      });
    }
  }
};
