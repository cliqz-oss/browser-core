export { default as historyManager } from "../platform/history-manager";

import CliqzUtils from "./utils";
import CliqzEvents from "./events";

const CliqzPromise = CliqzUtils.Promise;

export {
  CliqzUtils as utils,
  CliqzEvents as events,
  CliqzPromise as Promise,
};
