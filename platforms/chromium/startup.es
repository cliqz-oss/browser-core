/* global System */
import config from "../core/config";
import console from "../core/console";

function loadModule(moduleName) {
  return System.import(moduleName+"/background")
    .then( module => module.default.init(config) )
    .then( () => System.import(moduleName+"/window") )
    .then( module => (new module.default({ window })).init() )
    .catch( e => {
      console.log("Error on loading module: "+moduleName+" - "+e.toString()+" -- "+e.stack, "Extension");
    });
}

export default function (window, modules = config.modules) {
  // intersent config file with
  const modulesToLoad = modules.filter(function(n) {
    return config.modules.indexOf(n) != -1;
  });

    return loadModule("core").then( () => {
      return Promise.all(modulesToLoad.map(loadModule));
  });
};
