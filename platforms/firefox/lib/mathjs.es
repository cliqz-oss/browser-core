import { Services } from '../globals';
import config from '../../core/config';

const url = `${config.baseURL}vendor/math.min.js`;

let mathLib;

const load = () => {
  if (!mathLib) {
    const target = { };
    Services.scriptloader.loadSubScriptWithOptions(url, { target });
    mathLib = target.math;
  }
};

export default new Proxy({}, {
  get(target, prop) {
    load();
    return mathLib[prop];
  },
  set(target, prop, value) {
    load();
    mathLib[prop] = value;
    return value;
  },
});
