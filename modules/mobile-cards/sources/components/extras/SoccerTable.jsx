/* eslint-disable no-param-reassign */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import Link from '../Link';
import { getMessage } from '../../../core/i18n';
import { toggleSubscription, isSubscribedToLeague } from '../../../platform/subscriptions';
import SubscribeButton from '../SubscribeButton';
import PoweredByKicker from '../partials/PoweredByKicker';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';

const styles = StyleSheet.create({
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
    backgroundColor: '#F5F5F5',
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
    color: '#999999',
    fontWeight: '100',
    fontSize: 12,
  },
  tableBody: {
    color: 'black',
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
      .then(subscriptionData => this.setState({ subscriptionData }));
  }

  get isSubscribed() {
    return this.subscribedToLeague;
  }

  get actionMessage() {
    return this.isSubscribed ?
      getMessage('mobile_soccer_subscribe_league_done', this.props.data.leagueName) :
      getMessage('mobile_soccer_subscribe_league', this.props.data.leagueName);
  }

  displayHeader(groupName = null) {
    return (<View>
      {groupName && <Text style={styles.tableBody}>{groupName}</Text>}
      <View style={styles.header}>
        <Text numberOfLines={1} style={[styles.narrow, styles.tableHeader]} />
        <Text numberOfLines={1} style={[styles.wide, styles.tableHeader]}>Mannschaft</Text>
        <Text numberOfLines={1} style={[styles.narrow, styles.tableHeader]}>SP</Text>
        <Text numberOfLines={1} style={[styles.narrow, styles.tableHeader]}>TD</Text>
        <Text numberOfLines={1} style={[styles.narrow, styles.tableHeader]}>PKT</Text>
      </View>
    </View>);
  }

  displayRanking(ranking) {
    return ranking.map(row =>
      (<View style={styles.header} key={row.club}>
        <Text numberOfLines={1} style={[styles.narrow, styles.tableBody]}>{`${row.rank}.`}</Text>
        <Text numberOfLines={1} style={[styles.wide, styles.tableBody]}>{row.club}</Text>
        <Text numberOfLines={1} style={[styles.narrow, styles.tableBody]}>{row.SP}</Text>
        <Text numberOfLines={1} style={[styles.narrow, styles.tableBody]}>{row.TD}</Text>
        <Text numberOfLines={1} style={[styles.narrow, styles.tableBody]}>{row.PKT}</Text>
      </View>)
    );
  }

  displayGroup(group) {
    return (<View style={styles.groupContainer} key={group.group || 'key'}>
      {this.displayHeader(group.group)}
      {this.displayRanking(group.ranking)}
    </View>);
  }

  displayGroups(data) {
    if (!data.groups) {
      data.groups = [{ ranking: data.ranking }];
    }
    return (<View>
      {data.groups.map(this.displayGroup.bind(this))}
    </View>);
  }

  get content() {
    const data = this.state.data;

    return data && <Link url={data.url}>
      <View style={[styles.outerContainer]}>
        {this.displayGroups(data)}
      </View>
    </Link>;
  }

  render() {
    const type = 'soccer';

    return (<View style={styles.elementMargins}>
      {this.content}
      {Boolean(this.isValid) &&
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
      }
      <PoweredByKicker />
    </View>);
  }
}
