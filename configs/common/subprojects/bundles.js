const reactLibs = require('./react');

const subprojects = {
  // Re-export react libs
  react: reactLibs.react,
  reactDom: reactLibs.reactDom,
  reactTestUtils: reactLibs.reactTestUtils,

  // Define bundles
  ajv: {
    src: 'node_modules/ajv/dist',
    include: ['ajv.min.js'],
    dest: 'vendor',
  },
  qrcodejs: {
    src: 'node_modules/qrcodejs',
    include: ['qrcode.min.js'],
    dest: 'vendor',
  },
  tablesorter: {
    src: 'node_modules/tablesorter/dist/js',
    include: ['jquery.tablesorter.min.js'],
    dest: 'vendor',
  },
  chai: {
    src: 'node_modules/chai',
    include: ['chai.js'],
    dest: 'vendor'
  },
  'chai-dom': {
    src: 'node_modules/chai-dom',
    include: ['chai-dom.js'],
    dest: 'vendor',
  },
  mocha: {
    src: 'node_modules/mocha',
    include: ['mocha.css', 'mocha.js'],
    dest: 'vendor',
  },
  'core-js': {
    src: 'node_modules/core-js/client',
    include: ['core.js'],
    dest: 'vendor',
  },
  'ua-parser-js': {
    src: 'node_modules/ua-parser-js/dist',
    include: ['ua-parser.min.js'],
    dest: 'vendor',
  },
  moment: {
    src: 'node_modules/moment/min',
    include: ['moment.min.js'],
    dest: 'vendor',
  },
  '@cliqz/adblocker': {
    src: 'node_modules/@cliqz/adblocker/dist',
    include: [
      'adblocker.umd.min.js',
      'adblocker-cosmetics.umd.js',
    ],
    dest: 'vendor',
  },
  'cliqz-history': {
    src: 'node_modules/cliqz-history/dist',
    dest: 'cliqz-history'
  },
  '@cliqz-oss/dexie': {
    src: 'node_modules/@cliqz-oss/dexie/dist',
    include: ['dexie.min.js'],
    dest: 'vendor'
  },
  jquery: {
    src: 'node_modules/jquery/dist',
    include: ['jquery.min.js'],
    dest: 'vendor'
  },
  handlebars: {
    src: 'node_modules/handlebars/dist',
    include: ['handlebars.min.js'],
    dest: 'vendor'
  },
  pako: {
    src: 'node_modules/pako/dist',
    include: ['pako.min.js'],
    dest: 'vendor'
  },
  'tooltipster-js': {
    src: 'node_modules/tooltipster/dist/js',
    include: ['tooltipster.bundle.min.js'],
    dest: 'vendor'
  },
  'tooltipster-css': {
    src: 'node_modules/tooltipster/dist/css',
    include: ['tooltipster.bundle.min.css'],
    dest: 'vendor'
  },
  'tooltipster-sideTip-theme': {
    src: 'node_modules/tooltipster/dist/css/plugins/tooltipster/sideTip/themes',
    include: ['tooltipster-sideTip-shadow.min.css'],
    dest: 'vendor'
  },
  tldts: {
    src: 'node_modules/tldts/dist',
    include: ['tldts-experimental.umd.min.js'],
    dest: 'vendor',
  },
  sinon: {
    src: 'node_modules/sinon/pkg',
    include: ['sinon.js'],
    dest: 'vendor'
  },
  'sinon-chai': {
    src: 'node_modules/sinon-chai/lib',
    include: ['sinon-chai.js'],
    dest: 'vendor'
  },
  jsep: {
    src: 'node_modules/jsep/build',
    include: ['jsep.min.js'],
    dest: 'vendor'
  },
  spectrecss: {
    src: 'node_modules/spectre.css/dist/',
    include: ['spectre.min.css', 'spectre-icons.min.css', 'spectre-exp.min.css'],
    dest: 'vendor'
  },
  math: {
    src: 'node_modules/math-expression-evaluator/dist/browser/',
    include: ['math-expression-evaluator.min.js'],
    dest: 'vendor'
  },
};

module.exports = (modules) => {
  const result = [];
  modules.forEach((m) => {
    if (subprojects[m] === undefined) {
      throw new Error(`Could not find subproject: ${m}`);
    }
    result.push(subprojects[m]);
  });
  return result;
};
