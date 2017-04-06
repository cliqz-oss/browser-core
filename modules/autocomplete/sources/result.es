/*
 * This module acts as a result factory
 *
 */

import { utils } from "core/cliqz";

function log(msg){
    //utils.log(msg, 'Result.jsm');
}

// returns the super type of a result - type to be consider for UI creation
function getSuperType(result){
    if(result.type == 'bm' && result.snippet && result.template){
        return utils.getKnownType(result.template) || 'bm';  // backwards compatibility (most generic type, requires only url)
    }
    return null;
}

function combineSources(internal, cliqz){
  // do not add extra sources to end of EZs
  if(internal == "cliqz-extra")
    return internal;

  var cliqz_sources = cliqz.substr(cliqz.indexOf('sources-'))
  return internal + " " + cliqz_sources
}

var Result = {
    CLIQZR: 'cliqz-results',
    CLIQZC: 'cliqz-custom',
    CLIQZE: 'cliqz-extra',
    CLIQZCLUSTER: 'cliqz-cluster',
    CLIQZSERIES: 'cliqz-series',
    RULES: {
        'video': [
            { 'domain': 'youtube.com', 'ogtypes': ['video', 'youtube'] },
            { 'domain': 'vimeo.com', 'ogtypes': ['video'] },
            { 'domain': 'myvideo.de', 'ogtypes': ['video.tv_show', 'video.episode', 'video.other'] },
            { 'domain': 'dailymotion.com', 'ogtypes': ['video'] },
            { 'vertical': 'video' }
        ],
        'poster': [
            { 'domain': 'imdb.com', 'ogtypes': ['video.tv_show', 'tv_show', 'movie', 'video.movie', 'game', 'video.episode', 'actor', 'public_figure'] }
        ],
        'person': [
            { 'domain': 'xing.com', 'ogtypes': [ 'profile'] },
            { 'vertical': 'people' }
        ],
        'hq': [
            { 'vertical': 'hq'}
        ],
        'news': [
            { 'vertical': 'news'}
        ],
        'shopping': [
            { 'vertical': 'shopping'}
        ]
    },
	generic: function(style, value, image, comment, label, query, data, subtype){
        //try to show host name if no title (comment) is provided
        if(style.indexOf(Result.CLIQZC) === -1       // is not a custom search
           && (!comment || value == comment)   // no comment(page title) or comment is exactly the url
           && utils.isCompleteUrl(value)){       // looks like an url
            var host = utils.getDetailsFromUrl(value).name;
            if(host && host.length>0){
                comment = host[0].toUpperCase() + host.slice(1);
            }
        }
        if(!comment){
            comment = value;
        }

        data = data || {};
        data.kind = [utils.encodeResultType(style) + (subtype? '|' + JSON.stringify(subtype) : '')];
        var item = {
            style: style,
            val: value,
            comment: comment,
            label: label || value,
            query: query,
            data: data,
            image: image,
        };
        return item;
    },
    cliqz: function(result, q){
        var resStyle;
        if (!result.type) {
          result.type = 'bm'; // result.type will not be set if RH is down
        }
        if (result.snippet && result.snippet.desc) {
          // description will be called desc if RH is down
          result.snippet.description = result.snippet.desc;
        }
        if (result.type == 'bm') {
          resStyle = Result.CLIQZR + ' sources-' + utils.encodeSources(getSuperType(result) || result.type).join('');
        }
        else if (result.type == 'rh') {
          resStyle = Result.CLIQZE;
        }
        Object.assign(result.snippet, {
          subType: result.subType,
          trigger_urls: result.trigger,
          ts: result.ts,
          template: result.template || 'generic'
        });

        return Result.generic(
            resStyle, //style
            result.url, //value
            result.image, //image -> favico
            result.snippet.title,
            null, //label
            q, //query
            result.snippet,
            result.subType
        );
    },
    // Combine two results into a new result
    combine: function(first, second) {
        var ret = Result.clone(first);
        ret.image = ret.image || second.image;
        ret.style = combineSources(ret.style, second.style);
        ret.data.kind = (ret.data.kind || []).concat(second.data.kind || []);

        // copy over description, title and url list, if needed
        if(second.data.description && !ret.data.description)
            ret.data.description = second.data.description;
        if(second.data.title && !ret.data.title) // title
            ret.data.title = second.data.title;
        if(second.data.urls && !ret.data.urls) // history url list
            ret.data.urls = second.data.urls.map(
                item => {
                  item.favicon = item.favicon || ret.image;
                  return item;
                }
            );
        if (second.data.deepResults && !ret.data.deepResults)
          ret.data.deepResults = second.data.deepResults;
        if (second.data.extra && !ret.data.extra)
          ret.data.extra = second.data.extra;
        if (ret.data.template !== 'pattern-h2' && second.data.template != 'generic')
          ret.data.template = second.data.template;

        return ret;
    },
    // not really cloning the object !!!
    clone: function(entry) {
        var ret = Result.generic(entry.style, entry.val, entry.image, entry.comment, entry.label, entry.query, null);
        ret.data = JSON.parse(JSON.stringify(entry.data)); // nasty way of cloning an object
        if(entry.autocompleted) ret.autocompleted = true;
        return ret;
    },
    // check if a result should be kept in final result list
    isValid: function (url, urlparts) {

        // Google Filters
        if(urlparts.name.toLowerCase() == "google" &&
           urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() == "www" &&
           (urlparts.extra.indexOf("/search") != -1 || // "/search?" for regular SERPS and ".*/search/.*" for maps
            urlparts.extra.indexOf("/url?") == 0 ||    // www.google.*/url? - for redirects
            urlparts.extra.indexOf("q=") != -1 )) {    // for instant search results
            log("Discarding result page from history: " + url)
            return false;
        }
        // Bing Filters
        // Filter all like:
        //    www.bing.com/search?
        if(urlparts.name.toLowerCase() == "bing" && urlparts.extra.indexOf("q=") != -1) {
            log("Discarding result page from history: " + url)
            return false;
        }
        // Yahoo filters
        // Filter all like:
        //   search.yahoo.com/search
        //   *.search.yahooo.com/search - for international 'de.search.yahoo.com'
        //   r.search.yahoo.com - for redirects 'r.search.yahoo.com'
        if(urlparts.name.toLowerCase() == "yahoo" &&
           ((urlparts.subdomains.length == 1 && urlparts.subdomains[0].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0) ||
            (urlparts.subdomains.length == 2 && urlparts.subdomains[1].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0) ||
            (urlparts.subdomains.length == 2 && urlparts.subdomains[0].toLowerCase() == "r" && urlparts.subdomains[1].toLowerCase() == "search"))) {
            log("Discarding result page from history: " + url)
            return false;
        }

        // Ignore bitly redirections
        if (url.search(/http(s?):\/\/bit\.ly\/.*/i) === 0) {
            log("Discarding result page from history: " + url)
            return false;
        }

        // Ignore Twitter redirections
        if (url.search(/http(s?):\/\/t\.co\/.*/i) === 0) {
            log("Discarding result page from history: " + url)
            return false;
        }

        return true;
    },
    getOgImage: function(og) {
        if(og && og.image){
            var image = { src: og.image };

            if(og.duration && parseInt(og.duration)){
                var parsedDuration = Result.tryGetImageDuration(og.duration)
                if(parsedDuration) image.duration = parsedDuration;
            }

            return image;
        }
    },
    getVerticalImage: function(imageData, richData){
        if(imageData == undefined || imageData.src == undefined) return;

        var image = {
            src: imageData.src
        };


        if(imageData.width) image.width = imageData.width;
        if(imageData.height) image.height = imageData.height;
        if(imageData.ratio) image.ratio = imageData.ratio;

        // add duration from rich data
        if(richData && richData.duration){
            var parsedDuration = Result.tryGetImageDuration(richData.duration)
            if(parsedDuration) image.duration = parsedDuration;
        }

        return image
    },
    tryGetImageDuration: function(duration){
        try {
            var totalSeconds = parseInt(duration),
                min = Math.floor(totalSeconds/60),
                seconds = totalSeconds%60;
            return min + ':' + (seconds < 10 ? '0' + seconds : seconds);
        }
        catch(e){}

        return undefined;
    }
}

export default Result;
