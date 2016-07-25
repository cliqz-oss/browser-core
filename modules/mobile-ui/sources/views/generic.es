export default class {
  enhanceResults(data, {width, height}) {
    // trim description in case of embedded history results
    if (data.template === 'pattern-h2' && data.description) {
      // rough calculations to determine how much of description to show
      // line padding: 60, character width: 10, keyboard height: 400, line height: 20
      const descLength = (width - 60) / 10 * Math.max((height - 400) / 20, 1);
      if (data.description.length > descLength + 3) {
        data.description = data.description.slice(0, descLength) + '...';
      }
    }


    for(var i in data.external_links) {
      data.external_links[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.external_links[i].url));
    }

    if( data.richData && data.richData.additional_sources) {
      for(var i in data.richData.additional_sources) {
        data.richData.additional_sources[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.richData.additional_sources[i].url));
      }
    }

    (data.news || []).forEach(article => {
      const urlDetails = CliqzUtils.getDetailsFromUrl(article.url);
      article.logo = CliqzUtils.getLogoDetails(urlDetails);
    });

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
