'use strict';

const fs = require('fs');
const path = require('path');

function walk(p, filter) {
  let list = [];
  fs.readdirSync(p)
  .forEach((file) => {
    const fullPath = path.join(p, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      list = list.concat(walk(fullPath, filter));
    } else if (!filter || filter(fullPath)) {
      list.push(fullPath);
    }
  });
  return list;
}

module.exports = {
  walk: walk,
};
