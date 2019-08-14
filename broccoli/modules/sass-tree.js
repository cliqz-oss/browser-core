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
  cliqzConfig.modules.filter((name) => {
    const modulePath = `modules/${name}`;

    try {
      fs.statSync(`${modulePath}/sources/styles`); // throws if not found
      return true;
    } catch (e) {
      return false;
    }
  }).forEach((name) => {
    const modulePath = `modules/${name}`;

    fs.readdirSync(`${modulePath}/sources/styles`).forEach((file) => {
      const extName = path.extname(file);

      if ((file.indexOf('_') === 0)
        || ['.sass', '.scss'].indexOf(extName) === -1) {
        return;
      }

      const compiledCss = compileSass(
        [`${modulePath}/sources/styles`],
        file,
        file.replace(/\.(sass|scss)+$/, '.css'),
        {
          sourceMap: cliqzConfig.sourceMaps,
          functions: {
            'cdnUrl($path)': _path => new sass.types.String(`url(${CDN_BASEURL}/${_path.getValue()})`),
          },
        },
      );

      sassTrees.push(new Funnel(compiledCss, { destDir: `${name}/styles` }));
    });
  });

  return new MergeTrees(sassTrees);
};
