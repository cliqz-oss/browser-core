CLIQZ.UI.VIEWS["local-data-sc"] = {

}


CLIQZ.UI.VIEWS["local-cinema-sc"] = {

  enhanceMovieSC: function (data) {

    var rating = data.ratingStars.rating ? Math.round(data.ratingStars.rating) : 0,
        ratingCss = {
          true: 'on',
          false: 'off'
        };
    data.stars = Array.apply(null,Array(5)).map(function(_, i) {
      return {
        star_class: "cqz-rating-star-" + ratingCss[i<rating]
      };
    });

    for(var i in data.cinemas) {
      data.cinemas[i].cinema.distance = CliqzUtils.distance(
                        data.cinemas[i].cinema.lon,
                        data.cinemas[i].cinema.lat,
                      CliqzUtils.USER_LNG,
                      CliqzUtils.USER_LAT)*1000;
    }

    if (data.emptyColumns) {
      data.emptyColumns.map(function(x, _) {
        x.num_empty_columns = data.table_size - x.showtimes.length;
      });
    }
  },

  enhanceResults: function(data) {
    data.cinema.distance = CliqzUtils.distance(
                        data.cinema.lon,
                        data.cinema.lat,
                      CliqzUtils.USER_LNG,
                      CliqzUtils.USER_LAT)*1000;
    data.ratingStars = data.cinema;
    data.emptyColumns = data.movies;
    CLIQZ.UI.VIEWS["local-cinema-sc"].enhanceMovieSC(data);
  }
}


CLIQZ.UI.VIEWS["local-movie-sc"] = {

  enhanceMovieSC: CLIQZ.UI.VIEWS["local-cinema-sc"].enhanceMovieSC,

  enhanceResults: function(data) {
    data.ratingStars = data.movie;
    data.emptyColumns = data.cinemas;
    this.enhanceMovieSC(data);
  }
}




CLIQZ.UI.VIEWS["stocks"] = {

  enhanceResults: function(data) {
    var myTime = new Date(data.message.last_update * 1000);
      data.message.time_string = myTime.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  }
}


CLIQZ.UI.VIEWS["_generic"]
= CLIQZ.UI.VIEWS["entity-generic"]
= CLIQZ.UI.VIEWS["hq"] = {

  enhanceResults: function(data) {

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
}


CLIQZ.UI.VIEWS["weatherEZ"] = {
  enhanceResults: function(data) {
    if (data.forecast_url) {
      data.btns = [
        {
          'title_key': 'extended_forecast',
          'url': data.forecast_url
        }
      ];
    }
  }
}


CLIQZ.UI.VIEWS["weatherAlert"] = CLIQZ.UI.VIEWS["weatherEZ"];

// currency converter code


CLIQZ.UI.VIEWS["currency"] = {

  enhanceResults: function(data) {
      console.log(data);
  }
}
