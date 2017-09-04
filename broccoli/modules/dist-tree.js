'use strict';

const path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const broccoliSource = require('broccoli-source');

const cliqzConfig = require('../config');

var UnwatchedDir = broccoliSource.UnwatchedDir;

module.exports = function getDistTree(modulesTree) {
  const subprojectsTree = new UnwatchedDir('subprojects');
  const distTrees = [
    new Funnel(modulesTree, {
      include: cliqzConfig.modules.map( name => `${name}/dist/**/*` ),
      getDestinationPath(path) {
        return path.replace("/dist", "");
      }
    })];
  if (cliqzConfig.subprojects) {
    distTrees.push(new Funnel(subprojectsTree, {
      include: cliqzConfig.subprojects.map( name => `${name}/dist/**/*` ),
      getDestinationPath(path) {
        return path.replace("/dist", "");
      }
    }));
  }
  return new MergeTrees(distTrees);
}

