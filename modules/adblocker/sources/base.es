import logger from './logger';

/* Wraps filter-based adblocking in a class. It has to handle both
 * the management of lists (fetching, updating) using a FiltersLoader
 * and the matching using a FiltersEngine.
 */
export default class AdBlockerBase {
  constructor() {
    // This flag will be set to true only when the diagnosis page is opened
    this.diagnosisEnabled = false;
    this.blockingLogger = new Map();
    this.logs = [];
    this.engine = null;
    this.resetEngine();
  }

  log(msg) {
    const date = new Date();
    const message = `${date.getHours()}:${date.getMinutes()} ${msg}`;
    this.logs.push(message);
    logger.log(msg);
  }

  logBlocking(request, matchResult, totalTime) {
    // Only enabled when the diagnosis page is opened
    if (this.diagnosisEnabled) {
      if (request.rawType === 'main_frame' || !this.blockingLogger.has(request.sourceUrl)) {
        this.blockingLogger.set(request.sourceUrl, [`<tr>
          <th>Time</th>
          <th>Blocked</th>
          <th>Redirect</th>
          <th>Filter</th>
          <th>Cpt</th>
          <th>Url</th>
        </tr>`]);
      }

      let color = 'white';
      if (matchResult.redirect) {
        color = '#ffe552';
      } else if (matchResult.exception) {
        color = '#33cc33';
      } else if (matchResult.match) {
        color = '#ff5050';
      }

      this.blockingLogger.get(request.sourceUrl).push(`<tr
        style="background: ${color}">
        <td>${totalTime}</td>
        <td>${matchResult.match}</td>
        <td>${!!matchResult.redirect}</td>
        <td>${matchResult.filter || matchResult.exception || ''}</td>
        <td>${request.rawType}</td>
        <td>${request.url}</td>
      </tr>`);
    }
  }

  init() { return Promise.resolve(); }

  unload() {}

  /* @param {Object} request - Context of the request { url, sourceUrl, cpt }
  */
  match(request) {
    const t0 = Date.now();
    const matchResult = this.engine.match(request);
    const totalTime = Date.now() - t0;

    // Keeps track of altered requests (only if the diagnosis page is opened)
    this.logBlocking(request, matchResult, totalTime);

    return matchResult;
  }
}
