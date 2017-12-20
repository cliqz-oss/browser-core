import { Services } from '../globals';
import config from '../../core/config';

const url = `${config.baseURL}vendor/handlebars.min.js`;

let Handlebars;

const load = () => {
  if (!Handlebars) {
    const target = { };
    Services.scriptloader.loadSubScriptWithOptions(url, { target });
    Handlebars = target.Handlebars;
  }
};

export default new Proxy({}, {
  get(target, prop) {
    load();
    return Handlebars[prop];
  },
  set(target, prop, value) {
    load();
    Handlebars[prop] = value;
    return value;
  },
});
