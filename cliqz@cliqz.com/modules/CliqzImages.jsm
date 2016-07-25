'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzImages'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
                                  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var IM_SEARCH_CONF = {
    'DEFAULT_THUMB' :{"width": 300, "height": 200},
    'IMAGES_MARGIN':4,
    'IMAGES_LINES': 2, // Max displayed grid rows (lines)
    'OFFSET': 30, // Offset for the title (should be set automatically)
    'MARGIN':2,
    'CELL_HEIGHT':100
}

function getheight(images, width, margin) {
    width -= margin * images.length; //images  margin
    var h = 0;
    for (var i = 0; i < images.length; ++i) {
        if ('thumb' in images[i]){
            try {
                h += (images[i].thumb.width) / (images[i].thumb.height);
            }
            catch(err) {
                CliqzUtils.log('thumbs dim pb. '+err.message, CliqzImages.LOG_KEY);
                h += IM_SEARCH_CONF.DEFAULT_THUMB.width/IM_SEARCH_CONF.DEFAULT_THUMB.height;
            }
        } else {
            h += IM_SEARCH_CONF.DEFAULT_THUMB.width/IM_SEARCH_CONF.DEFAULT_THUMB.height;
        }
    }
    return width / h;
}

function setheight(images, height, margin) {
    var verif_width = 0;
    var estim_width = 0;
    for (var i = 0; i < images.length; ++i) {
        var width_float = null
        if ('thumb' in images[i]){
            try {
                width_float = (height * images[i].thumb.width) /images[i].thumb.height;
            }
            catch(err) {
                CliqzUtils.log('thumbs dim pb. '+err.message, CliqzImages.LOG_KEY);
                width_float = (height * IM_SEARCH_CONF.DEFAULT_THUMB.width) /IM_SEARCH_CONF.DEFAULT_THUMB.height;
            }

        } else {
            width_float = (height * IM_SEARCH_CONF.DEFAULT_THUMB.width) /IM_SEARCH_CONF.DEFAULT_THUMB.height;
        }

        verif_width += (margin + width_float);
        images[i].disp_width = parseInt(width_float);
        estim_width +=  (margin + images[i].disp_width);
        images[i].disp_height = parseInt(height);
    }

    // Collecting sub-pixel error
    var error = estim_width - parseInt(verif_width)

    if (error>0) {
        //var int_error = parseInt(Math.abs(Math.ceil(error)));
        // distribute the error on first images each take 1px
        for (var i = 0; i < error; ++i) {
            images[i].disp_width -= 1;
        }
    }
    else {
        error=Math.abs(error)
        //var int_error = parseInt(Math.abs(Math.floor(error)));
        for (var i = 0; i < error; ++i) {
            images[i].disp_width += 1;
        }
    }

    // Sanity check (Test)
    // var verify = 0;
    // for (var i = 0; i < images.length; ++i) {
    //    var width_float = height * images[i].image_width /images[i].image_height;
    //    verify += (images[i].width + IMAGES_MARGIN);
    // }

}


var CliqzImages = {
    LOG_KEY: 'Cliqz Images',
    IM_SEARCH_CONF : {
        'DEFAULT_THUMB' :{"width": 300, "height": 200},
        'IMAGES_MARGIN':4,
        'IMAGES_LINES': 2, // Max displayed grid rows (lines)
        'OFFSET': 30, // Offset for the title (should be set automatically)
        'MARGIN':2,
        'CELL_HEIGHT':100
    },
    test: function(){
        CliqzUtils.log('(empty test)', CliqzImages.LOG_KEY);
        return true;
    },
    process_images_result : function (res, max_height, width) {
        // Processing images to fit with max_height and width
        var tmp = [];
        var data = null;
        var effect_max_height = max_height;
        for(var k=0; k<res.results.length; k++){
            var r = res.results[k];
            if ('data' in r) {
                data = r.data;
            }
            if (r.vertical == 'images_beta' && data && data.template == 'images_beta') {
                var size =  width ;
                var n = 0;
                var images = data.items;
                CliqzUtils.log('(empty test)', CliqzImages.LOG_KEY);
                w: while ((images.length > 0) && (n<IM_SEARCH_CONF.IMAGES_LINES)){
                    if (n==0){
                        effect_max_height = Math.min(max_height, (IM_SEARCH_CONF.CELL_HEIGHT-IM_SEARCH_CONF.OFFSET));
                    }
                    var i = 1;
                    while ((i < images.length + 1) && (n<IM_SEARCH_CONF.IMAGES_LINES)){
                        var slice = images.slice(0, i);
                        var h = getheight(slice, size, IM_SEARCH_CONF.IMAGES_MARGIN);
                        // CliqzUtils.log('height: '+h + ', max height:' + effect_max_height, CliqzImages.LOG_KEY);
                        if (h < effect_max_height) {
                            setheight(slice, h, IM_SEARCH_CONF.IMAGES_MARGIN);
                            effect_max_height =  effect_max_height - h + max_height;
                            tmp.push.apply(tmp, slice);
                            n++;
                            images = images.slice(i);
                            continue w;
                        }
                        i++;
                    }
                    setheight(slice, Math.min(effect_max_height, h), IM_SEARCH_CONF.IMAGES_MARGIN);
                    tmp.push.apply(tmp, slice);
                    n++;
                    break;
                }
                res.results[k].data.items = tmp;
                res.results[k].data.lines = n;
                // CliqzUtils.log('lines: '+n, CliqzImages.LOG_KEY); // should be <= IM_SEARCH_CONF.IMAGES_LINES
            }
        }
    }
}
