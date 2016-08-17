import CliqzHistoryManager from "platform/history-manager";
export { CliqzHistoryManager as historyManager };

import CliqzUtils from "core/utils";
import CliqzEvents from "core/events";
export let utils = CliqzUtils;
export let events = CliqzEvents;

export let Promise = CliqzUtils.Promise;
