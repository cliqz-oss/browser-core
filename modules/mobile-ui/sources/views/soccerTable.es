import prefs from '../../core/prefs';
import { getMessage } from '../../core/i18n';
import Soccer from './soccer';

/**
* @namespace ui.views
*/
export default class SoccerTable extends Soccer {

  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {
    if (!data.groups) {
      data.groups = [{ranking: data.ranking}];
    }

    const { soccer: { league = [] } = {} } = prefs.getObject('subscriptions');
    data.league = {
      id: data.leagueId,
      name: data.leagueName,
      actionable: Boolean(data.leagueId),
      type: 'soccer',
      subtype: 'league',
    }
    if (this.isSubscribed(data.league, league)) {
      data.league.isSubscribed = true;
      data.league.subscriptionString = getMessage('mobile_soccer_unsubscribe');
      data.league.actionNote = getMessage('mobile_soccer_subscribe_league_done', data.leagueName);
    } else {
      data.league.isSubscribed = false;
      data.league.subscriptionString = getMessage('mobile_soccer_subscribe');
      data.league.actionNote = getMessage('mobile_soccer_subscribe_league', data.leagueName);
    }
  }
}
