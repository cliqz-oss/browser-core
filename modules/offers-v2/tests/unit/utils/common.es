const dexie = require('../../../core/unit/utils/dexie');
const logger = require('./logger');
const prefs = require('./prefs');
const misc = require('./misc');
const time = require('./time');
const patternidx = require('./patterindex-deps');
const fetch = require('./fetch');

module.exports = {
  ...dexie,
  ...logger,
  ...prefs,
  ...misc,
  ...time,
  ...patternidx,
  ...fetch,
};
