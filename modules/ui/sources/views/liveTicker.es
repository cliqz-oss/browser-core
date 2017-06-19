/**
* @namespace ui.views
*/
export default class {

  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {

    let gameIndex = 0;
    data.extra.matches.forEach(matchday => {
      matchday.matches.forEach(match => {
        gameIndex++;
        match.gameTimeHour = match.gameTime.split(', ')[1];
        match.class = match.isLive ? 'cqz-live' : '';
      });
    });

    data.livetickerSizeClass = gameIndex <= 4 ? 'cqz-result-h2' : 'cqz-result-h1';

  }
}
