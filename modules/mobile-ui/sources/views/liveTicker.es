import prefs from '../../core/prefs';
import { getMessage } from '../../core/i18n';
import Soccer from './soccer';
/**
* @namespace ui.views
*/
export default class extends Soccer {

  isSubscribedToTeam(teamId) {
    return this.subscribedTeams.includes(teamId);
  }

  isSubscribedToLeague(leagueId) {
    return this.subscribedLeagues.includes(leagueId);
  }

  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {
    const { soccer = {} } = prefs.getObject('subscriptions');
    const { game = [], team = [], league = [] } = soccer;
    this.subscribedGames = game;
    this.subscribedTeams = team;
    this.subscribedLeagues = league;

    let index = 0;

    data.matches.forEach(matchday => {
      matchday.matches.forEach(match => {
        data.leagueId = match.leagueId;
        data.leagueName = match.leagueName;
        match.type = 'soccer';
        match.subtype = 'game';
        const subscribedToHost = this.isSubscribedToTeam(match.hostId);
        const subscribedToGuest = this.isSubscribedToTeam(match.guestId);
        const subscribedToLeague = this.isSubscribedToLeague(match.leagueId);
        match.subscribedToOne = subscribedToHost || subscribedToGuest;
        match.subscribedToBoth = subscribedToHost && subscribedToGuest;
        match.subscribedToLeague = subscribedToLeague;
        const actionable = !subscribedToHost && !subscribedToGuest && !subscribedToLeague;
        if (match.id && (match.isLive || match.isScheduled) && actionable) {
          match.index = index++;
          // live or didn't start
          match.actionable = true;
          if (this.isSubscribed(match, this.subscribedGames)) {
            // subscribed to game
            match.isSubscribed = true;
            match.subscriptionString = getMessage('mobile_soccer_unsubscribe');
          } else {
            match.isSubscribed = false;
            match.subscriptionString = getMessage('mobile_soccer_subscribe');
          }
        }
        match.class = match.isLive ? 'cqz-live' : '';
      });
    });
    data.league = {
      id: data.leagueId,
      name: data.leagueName,
      actionable: Boolean(data.leagueId),
      type: 'soccer',
      subtype: 'league',
    }
    if (this.isSubscribed(data.league, this.subscribedLeagues)) {
      data.league.isSubscribed = true;
      data.league.subscriptionString = getMessage('mobile_soccer_unsubscribe');
      data.league.actionNote = getMessage('mobile_soccer_subscribe_league_done', data.leagueName);
    } else {
      data.league.isSubscribed = false;
      data.league.subscriptionString = getMessage('mobile_soccer_subscribe');
      data.league.actionNote = getMessage('mobile_soccer_subscribe_league', data.leagueName);
    }
    data.matches.forEach(matchday => {
      matchday.matches.forEach(match => match.buttonCount = index);
    });
  }
}
