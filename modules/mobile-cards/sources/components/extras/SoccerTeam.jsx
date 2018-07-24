import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import Link from '../Link';
import ExternalImage from '../custom/ExternalImage';
import { getMessage } from '../../../core/i18n';
import { toggleSubscription, isSubscribedToTeam } from '../../../platform/subscriptions';
import SubscribeButton from '../SubscribeButton';
import PoweredByKicker from '../partials/PoweredByKicker';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';

export default class SoccerTeam extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      matches: props.data.matches
    }
  }

  get isSubscribed() {
    return this.subscribedToTeam;
  }

  get actionMessage() {
    return this.isSubscribed ?
      getMessage('mobile_soccer_subscribe_league_done', this.teamName) :
      getMessage('mobile_soccer_subscribe_team', this.teamName);
  }

  updateSubscriptionData() {
    const data = this.props.data;
    return this.getSubscriptionData(data.matches)
    .then(matches => this.setState({matches}));
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
    .then(subscribedToTeam => {
      this.subscribedToTeam = subscribedToTeam;
      return matches;
    }).catch(() => {
      // subscriptions are not implemented natively
      // return unmodified data
      this.isValid = false;
      return matches;
    });
  }

  displayGameStatus(data) {
    if (data.isLive) {
      return <View>
        <Text style={styles.game}>{data.scored}</Text>
        <Text style={styles.game}>live</Text>
      </View>
    } else if (data.scored) {
      return <Text style={styles.game}>{data.scored}</Text>
    } else {
      return <Text style={styles.game}>vs.</Text>
    }
  }

  displayGame(data, index) {
    return <Link url={data.live_url} key={index}>
        <View style={styles.gameContainer}>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <Text style={[styles.header, { flex: 3 }]}>{data.spielTag}</Text>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <ExternalImage style={{ width: 20, height: 20 }} source={{ uri: data.leagueLogo }} resizeMode={'cover'} />
            </View>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.details}>{data.gameDate} ({data.gameTime})</Text>
            <Text style={styles.details}>{data.location}</Text>
          </View>
          <View style={styles.body}>
            <Text style={[styles.game, { flex: 2, textAlign: 'left' }]}>{data.HOST}</Text>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center' }}>
              { this.displayGameStatus(data) }
            </View>
            <Text style={[styles.game, { flex: 2, textAlign: 'right' }]}>{data.GUESS}</Text>
          </View>
        </View>
      </Link>
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

    return <View style={styles.container}>
        { this.content }
        { Boolean(this.isValid) &&
          <View style={{ ...elementTopMargin }}>
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

const styles = StyleSheet.create({
  container: {
    ...elementTopMargin,
    ...elementSideMargins,
  },
  gameContainer: {
    marginTop: 5,
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F5F5F5',
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
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  details: {
    marginTop: 2,
    color: '#999999',
    fontWeight: '100',
    fontSize: 12,
  },
  game: {
    color: 'black',
    fontSize: 14,
  }
});
