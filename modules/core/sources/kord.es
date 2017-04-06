import inject, { setGlobal as injectSetGlobal } from './kord/inject';

export default {
  inject,
};

export function setGlobal(app) {
  injectSetGlobal(app);
}
