'use strict';
var app, modules = {};

var storageCheck = function() {
  try {
    localStorage.setItem('test', true);
    localStorage.removeItem('test');
    window.indexedDB;
    return true;
  } catch(e) {
    return false;
  }
}

if(window.navigator.cookieEnabled && storageCheck()){
  var App = require('./core/app').default;

  app = new App({});

  Object.keys(app.availableModules).forEach(function (moduleName) {
    modules[moduleName] = {
      actions: app.availableModules[moduleName].backgroundModule.actions,
    };
  });
}

module.exports = {
  start: function () {
    if(window.navigator.cookieEnabled && storageCheck()){
      return app.start();
    } else {
      Promise.reject('Cookies or localStorage are disabled');
    }

  },
  modules: modules,
};
