'use strict';

const path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const broccoliSource = require('broccoli-source');

const cliqzConfig = require('../config');

var UnwatchedDir = broccoliSource.UnwatchedDir;

module.exports = function getDistTree(modulesTree) {
  const modulesTrees = [
    new Funnel(modulesTree, {
      include: cliqzConfig.modules.map( name => `${name}/dist/**/*` ),
      getDestinationPath(path) {
        return path.replace("/dist", "");
      }
    })];

  const distTrees = modulesTrees.concat(
    (cliqzConfig.subprojects || []).map(
      subproject => new Funnel(
        new UnwatchedDir(subproject.src), 
        {
          include: subproject.include || ['**/*'],
          destDir: subproject.dest
        }
      )
    )
  );

  return new MergeTrees(distTrees);
}

