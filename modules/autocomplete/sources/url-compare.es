/*
 * This module handles results(url) comparison
 *
 */

import TLDs from '../core/tlds-legacy';


var UrlCompare = {

  // Compare two URLs and return true if same or differing only by
  // country code in subdomain or path.
  sameUrls: function(url1, url2) {
      // Get generalized representation of each url
      var keys1 = UrlCompare._extractKeys(url1, '');
      var keys2 = UrlCompare._extractKeys(url2, '');

      // Compare the second one, which takes path into account
      return keys1[1] == keys2[1];
    },

  _filterTLDs: function(domain) {
    var v = domain.toLowerCase().split('.');

    // remove the first level yes or yes
    var first_level = TLDs[v[v.length - 1]];
    v[v.length - 1] = null;

    if ((v.length > 2) && (first_level == 'cc')) {
      // check if we also have to remove the second level, only if 3 or more
      //  levels and the first_level was a country code
      if (TLDs[v[v.length - 2]]) {
        v[v.length - 2] = null;
      }
    }

    // remove the nulls
    v = v.filter(function(n) { return n !== null; });

    // let's go to remove locales from the beginning, only if at least 2 or
    // more levels remaining and if the first_level was not a country code
    if ((v.length > 1) && (first_level != 'cc')) {

      // cover the case de.wikipedia.org
      if (TLDs[v[0]] == 'cc' || v[0] == 'en') {
        v[0] = null;
      }      else {
        // cover the case de-de.facebook.com
        var w = v[0].split('-');
        if ((w.length == 2) && (TLDs[w[0]] == 'cc' || w[0] == 'en') &&
            (TLDs[w[1]] == 'cc' || w[1] == 'en')) {
          v[0] = null;
        }
      }
    }

    // remove the nulls and join
    return v.filter(function(n) { return n !== null; }).join('.');
  },

  _filterTLDsInPath: function(path) {

    var v = path.toLowerCase().split('/');

    // it should have at least 2, "/".split('/') => ['', '']

    // we only consider the top level element in the path
    if (v.length > 1) {
      if (TLDs[v[1]] == 'cc') {
        v[1] = null;
      }      else {
        var w = v[1].split('-');
        if ((w.length == 2) && (TLDs[w[0]] == 'cc' || w[0] == 'en') && (TLDs[w[1]] == 'cc' || w[1] == 'en')) {
          v[1] = null;
        }
      }
    }

    // remove the nulls and join

    var clean_v = v.filter(function(n) { return n !== null; });

    var new_path = '/';

    if (clean_v.length > 1) {
      new_path = v.filter(function(n) { return n !== null; }).join('/');
    }    else {
      // special case when clean_v has only one element, it will not join the
      // initial slash
      new_path = '/' + v.filter(function(n) { return n !== null; }).join('/');
    }

    new_path = new_path.replace('//', '/');

    return new_path;

  },

  _extractKeys: function(url, title) {
    var clean_url =
      url.toLowerCase().replace(/^http[s]*:\/\//, '').replace(/^www\./, '');
    var v = clean_url.split('/');
    var domain = v[0];
    var path = '/';

    if (v.length > 1) {
      // remove the query string
      v[v.length - 1] = v[v.length - 1].split('?')[0];

      if (v[1] == '#') {
        // the path starts with # which is used for internal routing,
        // remove for keys
        // http://klout.com/#/solso == http://klout.com/solso
        if (v.length > 2) path = '/' + v.splice(2, v.length - 1).join('/');
      }      else path = '/' + v.splice(1, v.length - 1).join('/');
    }

    domain = UrlCompare._filterTLDs(domain);
    path = UrlCompare._filterTLDsInPath(path);

    // if no title or empty, generate a random key.
    // This is a fail-safe mechanism
    if ((title === undefined) || (title === null) || (title.trim() === '')) {
      title = '' + Math.random();
    }

    return [domain, domain + path, domain + title];
  },
};

export default UrlCompare;
