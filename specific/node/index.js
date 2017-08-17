'use strict';
var app, modules = {};

if(window.navigator.cookieEnabled){
  var App = require('./core/app');

  app = new App({});

  Object.keys(app.availableModules).forEach(function (moduleName) {
    modules[moduleName] = {
      actions: app.availableModules[moduleName].backgroundModule.actions,
    };
  });
}

module.exports = {
  start: function () {
    if(window.navigator.cookieEnabled){
      return app.start();
    } else {
      Promise.reject('Cookies are disabled');
    }

  },
  modules: modules,
};
