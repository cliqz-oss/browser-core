const cliqzEnv = require('../../broccoli/cliqz-env');

const builderConfig = {
  externals: ['react', 'react-dom', 'jquery', 'handlebars', 'math-expression-evaluator'],
  globalDeps: {
    react: 'React',
    'react-dom': 'ReactDOM',
    jquery: '$',
    handlebars: 'Handlebars',
    'math-expression-evaluator': 'mexp',
  },
  sourceMaps: !cliqzEnv.PRODUCTION,
  lowResSourceMaps: true,
  sourceMapContents: true,
  // required in case source module format is not esmb
  globalName: 'CliqzGlobal',
  // format: 'esm',
  // sourceMaps: cliqzConfig.PRODUCTION ? false : 'inline'
  rollup: !cliqzEnv.DEVELOPMENT,
};

module.exports = {
  builderConfig,
};
