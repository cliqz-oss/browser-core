/* eslint-disable no-param-reassign */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import Link from '../Link';
import { getMessage } from '../../../core/i18n';
import { toggleSubscription, isSubscribedToLeague } from '../../../platform/subscriptions';
import SubscribeButton from '../SubscribeButton';
import PoweredByKicker from '../partials/PoweredByKicker';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  elementMargins: {
    ...elementTopMargin,
    ...elementSideMargins,
  },
  outerContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  groupContainer: {
    marginTop: 5,
    backgroundColor: themeDetails[theme].soccer.container,
    borderRadius: 4,
    padding: 10,
  },
  header: {
    marginTop: 2,
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  narrow: {
    flex: 1
  },
  wide: {
    marginRight: 10,
    flex: 4,
  },
  tableHeader: {
    color: themeDetails[theme].soccer.subText,
    fontWeight: '100',
    fontSize: 12,
  },
  tableBody: {
    color: themeDetails[theme].soccer.mainText,
    fontWeight: 'bold',
    fontSize: 12,
  }
});

export default class SoccerTable extends React.Component {
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
    this.subtype = 'league';
    this.id = data.leagueId;
    this.isValid = Boolean(data.leagueId);
    return isSubscribedToLeague(this.id)
      .then((subscribedToLeague) => {
        this.subscribedToLeague = subscribedToLeague;
        return data;
      }).catch(() => {
      // subscriptions are not implemented natively
      // return unmodified data
        this.isValid = false;
        return data;
      });
  }

  updateSubscriptionData() {
    const data = this.props.data;
    return this.getSubscriptionData(data)
      // TODO fix the unused state
      /* eslint-disable-next-line react/no-unused-state */
      .then(subscriptionData => this.setState({ subscriptionData }));
  }

  get isSubscribed() {
    return this.subscribedToLeague;
  }

  get actionMessage() {
    return this.isSubscribed
      ? getMessage('mobile_soccer_subscribe_league_done', this.props.data.leagueName)
      : getMessage('mobile_soccer_subscribe_league', this.props.data.leagueName);
  }

  displayHeader(groupName = null) {
    const theme = this.props.theme;
    return (
      <View>
        {groupName && <Text style={styles(theme).tableBody}>{groupName}</Text>}
        <View
          accessible={false}
          accessibilityLabel="soccer-header-container"
          style={styles(theme).header}
        >
          <Text numberOfLines={1} style={[styles(theme).narrow, styles(theme).tableHeader]} />
          <View
            accessible={false}
            accessibilityLabel="soccer-header-header"
            style={styles(theme).wide}
          >
            <Text numberOfLines={1} style={styles(theme).tableHeader}>Mannschaft</Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="soccer-header-sp"
            style={styles(theme).narrow}
          >
            <Text numberOfLines={1} style={styles(theme).tableHeader}>SP</Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="soccer-header-td"
            style={styles(theme).narrow}
          >
            <Text numberOfLines={1} style={styles(theme).tableHeader}>TD</Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="soccer-header-pkt"
            style={styles(theme).narrow}
          >
            <Text numberOfLines={1} style={styles(theme).tableHeader}>PKT</Text>
          </View>
        </View>
      </View>
    );
  }

  displayRanking(ranking) {
    const theme = this.props.theme;
    return ranking.map(row =>
      (
        <View
          accessible={false}
          accessibilityLabel="soccer-ranking-container"
          style={styles(theme).header}
          key={row.club}
        >
          <View
            accessible={false}
            accessibilityLabel="soccer-ranking-rank"
            style={styles(theme).narrow}
          >
            <Text numberOfLines={1} style={styles(theme).tableBody}>{`${row.rank}.`}</Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="soccer-ranking-club"
            style={styles(theme).wide}
          >
            <Text numberOfLines={1} style={styles(theme).tableBody}>{row.club}</Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="soccer-ranking-sp"
            style={styles(theme).narrow}
          >
            <Text numberOfLines={1} style={styles(theme).tableBody}>{row.SP}</Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="soccer-ranking-td"
            style={styles(theme).narrow}
          >
            <Text numberOfLines={1} style={styles(theme).tableBody}>{row.TD}</Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="soccer-ranking-pkt"
            style={styles(theme).narrow}
          >
            <Text numberOfLines={1} style={styles(theme).tableBody}>{row.PKT}</Text>
          </View>
        </View>
      ));
  }

  displayGroup(group) {
    const theme = this.props.theme;

    return (
      <View
        accessible={false}
        accessibilityLabel="soccer-group-container"
        style={styles(theme).groupContainer}
        key={group.group || 'key'}
      >
        {this.displayHeader(group.group)}
        {this.displayRanking(group.ranking)}
      </View>
    );
  }

  displayGroups(data) {
    if (!data.groups) {
      data.groups = [{ ranking: data.ranking }];
    }
    return (
      <View>
        {data.groups.map(this.displayGroup.bind(this))}
      </View>
    );
  }

  get content() {
    const theme = this.props.theme;
    const data = this.state.data;

    return data
      && (
        <Link url={data.url}>
          <View style={[styles(theme).outerContainer]}>
            {this.displayGroups(data)}
          </View>
        </Link>
      );
  }

  render() {
    const type = 'soccer';
    const theme = this.props.theme;

    return (
      <View
        accessible={false}
        accessibilityLabel="soccer-table"
        style={styles(theme).elementMargins}
      >
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
