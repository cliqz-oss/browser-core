'use strict';

const path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const broccoliSource = require('broccoli-source');
const writeFile = require('broccoli-file-creator');

const cliqzConfig = require('../config');
const util = require('../util');

const UnwatchedDir = broccoliSource.UnwatchedDir;

const FILES_WITH_PLACEHOLDERS = {
  'freshtab': [
    'home.html',
  ],
};

module.exports = function getDistTree(modulesTree) {
  const modulesTrees = [
    new Funnel(modulesTree, {
      include: cliqzConfig.modules.map( name => `${name}/dist/**/*` ),
      getDestinationPath(path) {
        return path.replace("/dist", "");
      },
    })
  ];

  const distTrees = modulesTrees.concat(
    (cliqzConfig.subprojects || []).map(
      subproject =>
        new Funnel(new UnwatchedDir(subproject.src), {
          include: subproject.include || ['**/*'],
          destDir: subproject.dest,
          getDestinationPath(filename) {
            filename = filename.replace('.development', '');
            filename = filename.replace('.production.min', '');
            return filename;
          },
        })
    )
  );

  const distTree = new MergeTrees(distTrees);

  const config = writeFile('cliqz.json', JSON.stringify(cliqzConfig));

  const files = cliqzConfig.modules.reduce((all, module) => {
    const fileNames = (FILES_WITH_PLACEHOLDERS[module] || []).map(name => module + '/' + name);
    return all.concat(fileNames);
  }, []);

  const distWithConfig = util.injectConfig(distTree, config, 'cliqz.json', files);

  return new MergeTrees([
    distTree,
    distWithConfig,
  ], { overwrite: true });
}

