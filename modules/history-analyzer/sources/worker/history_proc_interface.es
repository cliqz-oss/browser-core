import HistoryProcMsgHandler from './history_proc_msg_handler';


function processResponse(data) {
  postMessage(data);
}

// /////////////////////////////////////////////////////////////////////////////
// global variables
const historyProcHandler = new HistoryProcMsgHandler(processResponse);

self.onmessage = function onMsg(msg) {
  historyProcHandler.onMessage(msg);
};

