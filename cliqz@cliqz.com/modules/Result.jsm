'use strict';
/*
 * This module acts as a result factory
 *
 */

var EXPORTED_SYMBOLS = ['Result'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');


function log(msg){
    //CliqzUtils.log(msg, 'Result.jsm');
}

// returns the super type of a result - type to be consider for UI creation
function getSuperType(result){
    if((CliqzUtils.RESULT_PROVIDER_ALWAYS_BM || result.source == 'bm') && result.snippet && result.snippet.rich_data){
        return CliqzUtils.getKnownType(result.snippet.rich_data.superType) || // superType used for custom templates
               CliqzUtils.getKnownType(result.snippet.rich_data.type)      || // fallback result type
               'bm';                                                           // backwards compatibility (most generic type, requires only url)
    }
    return null;
}

var Result = {
    CLIQZR: 'cliqz-results',
    CLIQZC: 'cliqz-custom',
    CLIQZE: 'cliqz-extra',
    CLIQZCLUSTER: 'cliqz-cluster',
    CLIQZSERIES: 'cliqz-series',
    CLIQZICON: 'http://cliqz.com/favicon.ico',
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
           && CliqzUtils.isCompleteUrl(value)){       // looks like an url
            var host = CliqzUtils.getDetailsFromUrl(value).name;
            if(host && host.length>0){
                comment = host[0].toUpperCase() + host.slice(1);
            }
        }
        if(!comment){
            comment = value;
        }

        data = data || {};
        data.kind = [CliqzUtils.encodeResultType(style) + (subtype? '|' + subtype : '')];

        var item = {
            style: style,
            val: value,
            comment: comment,
            label: label || value,
            query: query,
            data: data
        };
        return item;
    },
    cliqz: function(result){
        var resStyle = Result.CLIQZR + ' sources-' + CliqzUtils.encodeSources(getSuperType(result) || result.source).join(''),
            debugInfo = result.source + ' ' + result.q + ' ' + result.confidence;

        if(result.snippet){
            return Result.generic(
                resStyle, //style
                result.url, //value
                null, //image -> favico
                result.snippet.title,
                null, //label
                debugInfo, //query
                Result.getData(result),
                result.subType
            );
        } else {
            return Result.generic(resStyle, result.url, null, null, null, debugInfo, null, result.subType);
        }
    },
    cliqzExtra: function(result, snippet){
        result.data.subType = result.subType;
        result.data.trigger_urls = result.trigger_urls;
        result.data.ts = result.ts;

        return Result.generic(
            Result.CLIQZE, //style
            result.url, //value
            null, //image -> favico
            result.data.title,
            null, //label
            result.q, //query
            result.data,
            result.subType
        );
    },
    // Combine two results into a new result
    combine: function(first, second) {
        var ret = Result.clone(first);
        ret.style = CliqzUtils.combineSources(ret.style, second.style);
        ret.data.kind = (ret.data.kind || []).concat(second.data.kind || []);

        // copy over description and title, if needed
        if(second.data.description && !ret.data.description)
            ret.data.description = second.data.description;
        if(second.data.title) // title
            ret.data.title = second.data.title;

        return ret;
    },
    clone: function(entry) {
        var ret = Result.generic(entry.style, entry.val, null, entry.comment, entry.label, entry.query, null);
        ret.data = JSON.parse(JSON.stringify(entry.data)); // nasty way of cloning an object
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
    // rich data and image
    getData: function(result){
        //TODO: rethink the whole image filtering
        if(!result.snippet)
            return;

        var urlparts = CliqzUtils.getDetailsFromUrl(result.url),
            resp = {
                richData: result.snippet.rich_data,
                adult: result.snippet.adult || false
            },
            source = getSuperType(result) || result.source;

        resp.type = "other";
        for(var type in Result.RULES){
            var rules = Result.RULES[type];

            for(var rule_i in rules) {
                var rule = rules[rule_i];
                if(rule.domain && urlparts.host.indexOf(rule.domain) != -1)
                    for(var ogtype in (rule.ogtypes || []))
                        if(result.snippet && result.snippet.og &&
                           result.snippet.og.type == rule.ogtypes[ogtype])
                                resp.type = type;

                var verticals = source.split(',');
                for(var v in verticals){
                    if(verticals[v].trim() == rule.vertical)
                        resp.type = type;
                }
            }


        var snip = result.snippet;
        resp.description = snip && (snip.desc || snip.snippet || (snip.og && snip.og.description));
        resp.title = result.snippet.title;

        var ogT = snip && snip.og? snip.og.type: null,
            imgT = snip && snip.image? snip.image.type: null;

        if(resp.type != 'other' || ogT == 'cliqz' || imgT == 'cliqz')
            resp.image = Result.getVerticalImage(result.snippet.image, result.snippet.rich_data) ||
                         Result.getOgImage(result.snippet.og)
        }

        return resp;
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
