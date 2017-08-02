'use strict';

var App = require('./core/app').default;
var app = new App({});
var modules = {};

Object.keys(app.availableModules).forEach(function (moduleName) {
  modules[moduleName] = {
    actions: app.availableModules[moduleName].backgroundModule.actions,
  };
});

module.exports = {
  start: function () {
    return app.start();
  },
  modules: modules,
};
