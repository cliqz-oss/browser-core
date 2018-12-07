import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';

import Link from '../Link';
import { getMessage } from '../../../core/i18n';
import { toggleSubscription, isSubscribedToTeam } from '../../../platform/subscriptions';
import SubscribeButton from '../SubscribeButton';
import PoweredByKicker from '../partials/PoweredByKicker';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  container: {
    ...elementSideMargins,
  },
  gameContainer: {
    marginTop: 5,
    flex: 1,
    flexDirection: 'column',
    backgroundColor: themeDetails[theme].soccer.container,
    borderRadius: 5,
    paddingTop: 10,
    paddingLeft: 8,
    paddingRight: 8,
  },
  body: {
    marginTop: 14,
    marginBottom: 14,
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
  },
  header: {
    color: themeDetails[theme].soccer.mainText,
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  details: {
    marginTop: 2,
    color: themeDetails[theme].soccer.subText,
    fontWeight: '100',
    fontSize: 12,
  },
  game: {
    color: themeDetails[theme].soccer.mainText,
    fontSize: 14,
  }
});

export default class SoccerTeam extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      matches: props.data.matches
    };
  }

  componentDidMount() {
    this.updateSubscriptionData();
  }

  getSubscriptionData(matches) {
    if (!matches[0]) {
      return Promise.resolve(matches);
    }
    this.subtype = 'team';
    this.id = matches[0].teamId;
    this.teamName = matches[0].club;
    this.isValid = Boolean(matches[0].teamId);

    return isSubscribedToTeam(this.id)
      .then((subscribedToTeam) => {
        this.subscribedToTeam = subscribedToTeam;
        return matches;
      }).catch(() => {
        // subscriptions are not implemented natively
        // return unmodified data
        this.isValid = false;
        return matches;
      });
  }

  get isSubscribed() {
    return this.subscribedToTeam;
  }

  get actionMessage() {
    return this.isSubscribed
      ? getMessage('mobile_soccer_subscribe_league_done', this.teamName)
      : getMessage('mobile_soccer_subscribe_team', this.teamName);
  }

  updateSubscriptionData() {
    const data = this.props.data;
    return this.getSubscriptionData(data.matches)
      .then(matches => this.setState({ matches }));
  }

  displayGameStatus(data) {
    const theme = this.props.theme;
    if (data.isLive) {
      return (
        <View
          accessible={false}
          accessibilityLabel="soccer-game-status"
        >
          <Text style={styles(theme).game}>{data.scored}</Text>
          <Text style={styles(theme).game}>live</Text>
        </View>
      );
    }
    if (data.scored) {
      return (
        <View
          accessible={false}
          accessibilityLabel="soccer-game-status"
        >
          <Text style={styles(theme).game}>{data.scored}</Text>
        </View>
      );
    }
    return <Text style={styles(theme).game}>vs.</Text>;
  }

  displayGame(data) {
    const theme = this.props.theme;

    return (
      <Link label="soccer-game-container" url={data.live_url} key={data.live_url}>
        <View style={styles(theme).gameContainer}>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View
              accessible={false}
              accessibilityLabel="soccer-game-spieltag"
            >
              <Text style={[styles(theme).header, { flex: 3 }]}>{data.spielTag}</Text>
            </View>
            <View
              accessible={false}
              accessibilityLabel="soccer-game-logo"
              style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}
            >
              <Image style={{ width: 20, height: 20 }} source={{ uri: data.leagueLogo }} resizeMode="cover" />
            </View>
          </View>
          <View style={styles(theme).detailsContainer}>
            <View
              accessible={false}
              accessibilityLabel="soccer-game-date"
            >
              <Text style={styles(theme).details}>
                {`${data.gameDate} (${data.gameTime})`}
              </Text>
            </View>
            <View
              accessible={false}
              accessibilityLabel="soccer-game-location"
            >
              <Text style={styles(theme).details}>{data.location}</Text>
            </View>
          </View>
          <View style={styles(theme).body}>
            <View
              accessible={false}
              accessibilityLabel="soccer-game-host"
            >
              <Text style={[styles(theme).game, { flex: 2, textAlign: 'left' }]}>{data.HOST}</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center' }}>
              {this.displayGameStatus(data)}
            </View>
            <View
              accessible={false}
              accessibilityLabel="soccer-game-guest"
            >
              <Text style={[styles(theme).game, { flex: 2, textAlign: 'right' }]}>{data.GUESS}</Text>
            </View>
          </View>
        </View>
      </Link>
    );
  }

  get content() {
    const matches = this.state.matches;
    if (!matches) {
      return null;
    }
    // show games in reverse order (live or next game first)
    return matches.map(this.displayGame.bind(this)).reverse();
  }

  render() {
    const type = 'soccer';
    const theme = this.props.theme;

    return (
      <View
        accessible={false}
        accessibilityLabel="soccer"
        style={styles(theme).container}
      >
        {this.content}
        {Boolean(this.isValid)
          && (
            <View style={{ ...elementTopMargin }}>
              <SubscribeButton
                onPress={() => {
                  toggleSubscription(type, this.subtype, this.id, this.isSubscribed)
                  //  .then(this.updateSubscriptionData.bind(this));
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
