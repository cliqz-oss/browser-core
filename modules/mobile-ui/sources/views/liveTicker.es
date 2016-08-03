/**
* @namespace ui.views
*/
export default class {

  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {
    data.matches.forEach(matchday => {
      matchday.matches.forEach(match => {
        match.gameTimeHour = match.gameTime.split(', ')[1];
        match.class = match.isLive ? 'cqz-live' : '';
      });
    });
  }
}
