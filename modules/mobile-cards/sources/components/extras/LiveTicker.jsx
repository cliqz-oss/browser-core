import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import Link from '../Link';
import { getMessage } from '../../../core/i18n';
import { toggleSubscription, checkSubscriptions, isSubscribedToLeague } from '../../../platform/subscriptions';
import SubscribeButton from '../SubscribeButton';
import PoweredByKicker from '../partials/PoweredByKicker';
import { elementTopMargin, elementSideMargins, cardWidth } from '../../styles/CardStyle';


export default class extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data
    }
  }

  get isSubscribed() {
    return this.subscribedToLeague;
  }

  get actionMessage() {
    return this.isSubscribed ?
      getMessage('mobile_soccer_subscribe_league_done', this.leagueName) :
      getMessage('mobile_soccer_subscribe_league', this.leagueName);
  }

  componentDidMount() {
    this.updateSubscriptionData();
  }

  updateSubscriptionData() {
    const data = this.props.data;
    this.getSubscriptionData(data).then(data => this.setState({data}));
  }

  getSubscriptionData(data) {
    const { leagueId, leagueName } = data.matches[0].matches[0];
    this.id = leagueId;
    this.leagueName = leagueName;
    this.isValid = Boolean(leagueId); // league subscription possible
    this.subtype = 'league';
    return isSubscribedToLeague(leagueId)
    .then(subscribedToLeague => {
      this.subscribedToLeague = subscribedToLeague;
      if (subscribedToLeague) {
        return Promise.resolve(data);
      }
      return Promise.all(data.matches.map(gameDay =>
        Promise.all(gameDay.matches.map(match => {
          const batch = [
            {type: 'soccer', subtype: 'team', id: match.hostId},
            {type: 'soccer', subtype: 'team', id: match.guestId},
            {type: 'soccer', subtype: 'game', id: match.id},
          ];
          return checkSubscriptions(batch)
          .then(([subscribedToHost, subscribedToGuest, subscribedToGame]) => {
            // append subscription data to single game data
            return {
              ...match,
              notSubscribedToLeague: true,
              subscribedToHost,
              subscribedToGuest,
              subscribedToGame,
            };
          });
        })).then(matches => {
          // append gameday games list to gameday data
          return {
            ...gameDay,
            matches,
          }
        })
      )).then(matches => {
        // append gamedays list to data
        return {
          ...data,
          matches,
        }
      });
    }).catch(() => {
      // subscriptions are not implemented natively
      // return unmodified data
      this.isValid = false;
      return data;
    });
  }

  displayMatches(matches) {
    const gameContainerWidth = (cardWidth() - elementSideMargins.marginLeft - elementSideMargins.marginRight - 10) / 2;
    const gameContainerHeight = (cardWidth() - elementSideMargins.marginLeft - elementSideMargins.marginRight - 10) / 2.5;
    return (
      matches.map((match, index) => {
          const isValid = match.id && (match.isLive || match.isScheduled) && match.notSubscribedToLeague;
          let actionMessage = '';
          if (match.subscribedToHost && match.subscribedToGuest) {
            actionMessage = getMessage('mobile_soccer_subscribed_to_both');
          } else if (match.subscribedToHost || match.subscribedToGuest) {
            actionMessage = getMessage('mobile_soccer_subscribed_to_one');
          }
          return <Link to={match.live_url} key={index}>
            <View style={styles(index, gameContainerWidth, gameContainerHeight).gameContainer}>
              <Text
                style={styles(index, gameContainerWidth, gameContainerHeight).gameText}
                numberOfLines={1}
              >
                { match.HOST }
              </Text>
              <Text
                style={styles(index, gameContainerWidth, gameContainerHeight).gameText}
                numberOfLines={1}
              >
                { match.scored }
                <Text style={styles().gameHourText}>
                  { ` (${match.gameTime})` }
                </Text>
              </Text>
              <Text
                style={styles(index, gameContainerWidth, gameContainerHeight).gameText}
                numberOfLines={1}
              >
                { match.GUESS }
              </Text>
              { Boolean(isValid) &&
                <View style={{ marginTop: 4, width: gameContainerWidth - 10 }}>
                  <SubscribeButton
                    onPress={() => {
                      toggleSubscription('soccer', 'game', match.id, match.subscribedToGame)
                      .then(this.updateSubscriptionData.bind(this));
                    }}
                    isSubscribed={match.subscribedToGame}
                    actionMessage={actionMessage}
                    noButton={Boolean(actionMessage)}
                  />
                </View>
              }
            </View>
          </Link>
        }
      )
    );
  }

  displayMatchDay(matchDay, index) {
    return <View key={index} style={{ ...elementTopMargin }}>
      <Text style={styles().headerText}>{ matchDay.date }</Text>
      <View style={styles().matchesView}>
        { this.displayMatches(matchDay.matches) }
      </View>
    </View>
  }

  get content() {
    const data = this.state.data;

    return data && <View>
        { data.matches.map(this.displayMatchDay.bind(this)) }
      </View>
  }

  render() {
    const type = 'soccer';

    return <View style={styles().elementMargins}>
        { this.content }
        { Boolean(this.isValid) &&
          <View style={{ ...elementTopMargin  }}>
            <SubscribeButton
              onPress={() => {
                toggleSubscription(type, this.subtype, this.id, this.isSubscribed)
                .then(this.updateSubscriptionData.bind(this));
              }}
              isSubscribed={this.isSubscribed}
              actionMessage={this.actionMessage}
            />
          </View>
        }
        <PoweredByKicker />
      </View>
  }
}

const styles = (containerIndex, containerWidth, containerHeight) => StyleSheet.create({
  elementMargins: {
    ...elementTopMargin,
    ...elementSideMargins,
  },
  headerText: {
    marginTop: 0,
    fontSize: 14,
    fontWeight: 'bold',
    color: 'black',
  },
  matchesView: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  gameContainer: {
    width: containerWidth,
    height: containerHeight,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: !(containerIndex % 2 === 0) ? 10 : 0,
    marginTop: 10,
    borderRadius: 5,
    padding: 5,
  },
  gameText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: containerHeight / 5,
  },
  gameHourText: {
    color: '#999999',
    fontSize: 10,
  }
});
