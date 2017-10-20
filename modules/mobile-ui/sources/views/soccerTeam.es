import prefs from '../../core/prefs';
import { getMessage } from '../../core/i18n';
import Soccer from './soccer';
/**
* @namespace ui.views
*/
export default class extends Soccer {

  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {
    const { soccer: { team = [] } = {} } = prefs.getObject('subscriptions');
    const gameData = data.matches && data.matches.slice(0, 2).reverse();
    if (gameData[0]) {
      data.gameData = gameData;
      data.team = {
        id: gameData[0].teamId,
        name: gameData[0].club,
        actionable: Boolean(gameData[0].teamId),
        actionNote: getMessage('mobile_soccer_subscribe_team', gameData[0].club),
        type: 'soccer',
        subtype: 'team',
      };
      if (this.isSubscribed(data.team, team)) {
        data.team.isSubscribed = true;
        data.team.subscriptionString = getMessage('mobile_soccer_unsubscribe');
      } else {
        data.team.isSubscribed = false;
        data.team.subscriptionString = getMessage('mobile_soccer_subscribe');
      }
    }
  }
}
