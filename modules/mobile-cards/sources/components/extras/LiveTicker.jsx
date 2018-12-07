import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import Link from '../Link';
import { getMessage } from '../../../core/i18n';
import { toggleSubscription, checkSubscriptions, isSubscribedToLeague } from '../../../platform/subscriptions';
import SubscribeButton from '../SubscribeButton';
import PoweredByKicker from '../partials/PoweredByKicker';
import { elementTopMargin, elementSideMargins, cardWidth } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = ({ index, gameContainerWidth, gameContainerHeight, theme } = {}) =>
  StyleSheet.create({
    elementMargins: {
      ...elementTopMargin,
      ...elementSideMargins,
    },
    headerText: {
      marginTop: 0,
      fontSize: 14,
      fontWeight: 'bold',
      color: themeDetails[theme].txtColor,
    },
    matchesView: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    gameContainer: {
      width: gameContainerWidth,
      height: gameContainerHeight,
      backgroundColor: themeDetails[theme].soccer.container,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: !(index % 2 === 0) ? 10 : 0,
      marginTop: 10,
      borderRadius: 5,
      padding: 5,
    },
    gameText: {
      color: themeDetails[theme].soccer.mainText,
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: gameContainerHeight / 5,
    },
    gameHourText: {
      color: themeDetails[theme].soccer.subText,
      fontSize: 10,
    }
  });

export default class LiveTicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data
    };
  }

  componentDidMount() {
    this.updateSubscriptionData();
  }

  getSubscriptionData(data) {
    const { leagueId, leagueName } = data.matches[0].matches[0];
    this.id = leagueId;
    this.leagueName = leagueName;
    this.isValid = Boolean(leagueId); // league subscription possible
    this.subtype = 'league';
    return isSubscribedToLeague(leagueId)
      .then((subscribedToLeague) => {
        this.subscribedToLeague = subscribedToLeague;
        if (subscribedToLeague) {
          return Promise.resolve(data);
        }
        return Promise.all(data.matches.map(gameDay =>
          Promise.all(gameDay.matches.map((match) => {
            const batch = [
              { type: 'soccer', subtype: 'team', id: match.hostId },
              { type: 'soccer', subtype: 'team', id: match.guestId },
              { type: 'soccer', subtype: 'game', id: match.id },
            ];
            return checkSubscriptions(batch)
              .then(([subscribedToHost, subscribedToGuest, subscribedToGame]) =>
                // append subscription data to single game data
                ({
                  ...match,
                  notSubscribedToLeague: true,
                  subscribedToHost,
                  subscribedToGuest,
                  subscribedToGame,
                }));
          })).then(matches =>
            // append gameday games list to gameday data
            ({
              ...gameDay,
              matches,
            })))).then(matches =>
        // append gamedays list to data
          ({
            ...data,
            matches,
          }));
      }).catch(() => {
        // subscriptions are not implemented natively
        // return unmodified data
        this.isValid = false;
        return data;
      });
  }

  get isSubscribed() {
    return this.subscribedToLeague;
  }

  get actionMessage() {
    return this.isSubscribed
      ? getMessage('mobile_soccer_subscribe_league_done', this.leagueName)
      : getMessage('mobile_soccer_subscribe_league', this.leagueName);
  }

  updateSubscriptionData() {
    const data = this.props.data;
    // TODO fix the unused state
    /* eslint-disable-next-line react/no-unused-state */
    this.getSubscriptionData(data).then(subscriptionData => this.setState({ subscriptionData }));
  }

  displayMatches(matches) {
    const theme = this.props.theme;
    const gameContainerWidth = (
      cardWidth()
      - elementSideMargins.marginLeft
      - elementSideMargins.marginRight - 10
    ) / 2;
    const gameContainerHeight = (
      cardWidth()
      - elementSideMargins.marginLeft
      - elementSideMargins.marginRight - 10
    ) / 2.5;
    return (
      matches.map((match, index) => {
        const isValid = match.id
          && (match.isLive || match.isScheduled)
          && match.notSubscribedToLeague;
        let actionMessage = '';
        if (match.subscribedToHost && match.subscribedToGuest) {
          actionMessage = getMessage('mobile_soccer_subscribed_to_both');
        } else if (match.subscribedToHost || match.subscribedToGuest) {
          actionMessage = getMessage('mobile_soccer_subscribed_to_one');
        }
        return (
          <Link
            label="liveticker-game-container"
            url={match.live_url}
            key={match.live_url}
          >
            <View
              style={
                styles({ index, gameContainerWidth, gameContainerHeight, theme }).gameContainer
              }
            >
              <View
                accessible={false}
                accessibilityLabel="liveticker-game-host"
              >
                <Text
                  style={styles({ index, gameContainerWidth, gameContainerHeight, theme }).gameText}
                  numberOfLines={1}
                >
                  {match.HOST}
                </Text>
              </View>
              <View
                accessible={false}
                accessibilityLabel="liveticker-game-score-date"
              >
                <Text
                  style={styles({ index, gameContainerWidth, gameContainerHeight, theme }).gameText}
                  numberOfLines={1}
                >
                  {match.scored}
                  <Text style={styles({ theme }).gameHourText}>
                    {` (${match.gameTime})`}
                  </Text>
                </Text>
              </View>
              <View
                accessible={false}
                accessibilityLabel="liveticker-game-guess"
              >
                <Text
                  style={styles({ index, gameContainerWidth, gameContainerHeight, theme }).gameText}
                  numberOfLines={1}
                >
                  {match.GUESS}
                </Text>
              </View>
              {Boolean(isValid)
                && (
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
                )
              }
            </View>
          </Link>
        );
      })
    );
  }

  displayMatchDay(matchDay) {
    const theme = this.props.theme;
    return (
      <View
        accessible={false}
        accessibilityLabel="liveticker-matches"
        key={matchDay.date}
        style={{ ...elementTopMargin }}
      >
        <View
          accessible={false}
          accessibilityLabel="liveticker-matches-date"
        >
          <Text style={styles({ theme }).headerText}>{matchDay.date}</Text>
        </View>
        <View
          accessible={false}
          accessibilityLabel="liveticker-matches-container"
          style={styles({ theme }).matchesView}
        >
          {this.displayMatches(matchDay.matches)}
        </View>
      </View>
    );
  }

  get content() {
    const data = this.state.data;

    return data
      && (
        <View>
          {data.matches.map(this.displayMatchDay.bind(this))}
        </View>
      );
  }

  render() {
    const type = 'soccer';
    const theme = this.props.theme;
    return (
      <View style={styles({ theme }).elementMargins}>
        {this.content}
        {Boolean(this.isValid)
          && (
            <View style={{ ...elementTopMargin }}>
              <SubscribeButton
                onPress={() => {
                  toggleSubscription(type, this.subtype, this.id, this.isSubscribed)
                    .then((...args) => this.updateSubscriptionData(...args));
                }}
                isSubscribed={this.isSubscribed}
                actionMessage={this.actionMessage}
              />
            </View>
          )
        }
        <PoweredByKicker
          logo={this.props.result.meta.externalProvidersLogos.kicker}
          theme={theme}
        />
      </View>
    );
  }
}
