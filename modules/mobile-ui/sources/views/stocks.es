export default class {
  enhanceResults(data) {
    var myTime = new Date(data.extra.message.last_update * 1000);
    data.extra.message.time_string = myTime.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  }
};
