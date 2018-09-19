'use strict';

const fs = require('fs');
const path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const sass = require('sass');
const compileSass = require('broccoli-sass-source-maps')(sass);

const cliqzConfig = require('../config');
const CDN_BASEURL = cliqzConfig.settings.CDN_BASEURL;

module.exports = function getSassTree() {
  const sassTrees = [];
  cliqzConfig.modules.filter( name => {
    let modulePath = `modules/${name}`;

    try {
      fs.statSync(modulePath+"/sources/styles"); // throws if not found
      return true;
    } catch (e) {
      return false;
    }
  }).forEach(name => {
    let modulePath = `modules/${name}`;

    fs.readdirSync( modulePath+'/sources/styles').forEach(function (file) {
      var extName = path.extname(file);

      if ( (file.indexOf('_') === 0) ||
           ['.sass', '.scss'].indexOf(extName) === -1 ) {
        return;
      }

      var compiledCss = compileSass(
        [modulePath+'/sources/styles'],
        file,
        file.replace(/\.(sass|scss)+$/, '.css'),
        {
          sourceMap: cliqzConfig.sourceMaps,
          functions: {
            'cdnUrl($path)': function (path) {
              return new sass.types.String('url('+CDN_BASEURL+'/'+path.getValue()+')');
            },
          },
        },
      );

      sassTrees.push(new Funnel(compiledCss, { destDir: `${name}/styles` }));
    });
  });

  return new MergeTrees(sassTrees);
}
