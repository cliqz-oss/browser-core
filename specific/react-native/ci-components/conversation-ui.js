import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  StackNavigator,
} from 'react-navigation';

import startup from '../modules/platform/startup';

import Home from './home';
import Dashboard from './dashboard';
import Domainboard from './domainboard';

import Reminders from '../modules/history/reminders';


const queryCliqz = (app, navigation, query="") => {
  app.modules.core.background.actions.queryCliqz(query);
  return false;
};

const openUrl = (app, navigation, url) => {
  app.modules.core.background.actions.openLink(url);
  return false;
};

const openTab = (app, tabId) => {
  app.modules.core.background.actions.openTab(tabId);
  return false;
};

const getOpenTabs = (app) => {
  return app.modules.core.background.actions.getOpenTabs();
};

const getReminders = (app, domain) => {
  return app.modules.core.background.actions.getReminders(domain);
};

class HistorySync {
  constructor(getHistory, setState) {
    this.getHistory = getHistory;
    this.setState = setState;
    this.interval = 3000;
    this.latestFrameStartsAt = Infinity;
    this.limit = 100;
  }

  start() {
    const startAt = Date.now() * 1000;
    const more = function (frameStartsAt) {
      const endsAt = Date.now() * 1000;
      this.fetch({
        frameStartsAt: frameStartsAt + 1,
        frameEndsAt: endsAt,
      }).then(() => {
        setTimeout(() => {
          more(endsAt);
        }, this.interval);
      });
    }.bind(this);

    return this.fetch({
      limit: this.limit,
      frameEndsAt: startAt,
    }).then(
      ({history}) => setTimeout(more, this.interval, history.frameEndsAt)
    );
  }

  fetch(params) {
    return this.getHistory(params).then(history => {
      this.updateLatestFrameStartsAt(history);

      return {
        history,
      };
    });
  }

  updateLatestFrameStartsAt(history) {

    if (history.frameStartsAt < this.latestFrameStartsAt) {
      this.latestFrameStartsAt = history.frameStartsAt;
    }

    this.setState((prev) => {
      prev = prev || {};
      const oldHistory = prev.store ? prev.store.history : { domains: {} };
      const newHistory = mergeHistory(oldHistory, history);
      return {
        store: {
          ...(prev.store || {}),
          history: newHistory,
        }
      }
    });
  }

  loadMore() {
    const params = {
      limit: this.limit,
      frameEndsAt: this.latestFrameStartsAt,
    };

    return this.fetch(params);
  }
}

function mergeHistory(oldHistory, newHistory) {
  let merge;
  const domains = { ...oldHistory.domains };
  merge = {
    ...oldHistory,
    domains,
  };

  Object.keys(newHistory.domains).forEach((domain) => {
    const oldDomain = oldHistory.domains[domain] || {
      visits: []
    };
    const newDomain = newHistory.domains[domain];
    domains[domain] = {
      ...oldDomain,
      ...newDomain,
      visits: [
        ...newDomain.visits,
        ...oldDomain.visits,
      ]
    }
    //console.log("XXXX merge: ", domain, oldDomain.visits.length, newDomain.visits.length, domains[domain].visits.length);
  });

  return merge;
}



export default class extends React.Component {

  constructor(props) {
    super(props);
    this.nav = StackNavigator(Object.assign({
      Home: { screen: Home },
      Dashboard: { screen: Dashboard },
      Domainboard: { screen: Domainboard },
    }, props.extraScreens), {
      initialRouteName: 'Home',
      headerMode: 'none',
    });
  }

  componentDidMount() {
    startup.then((app) => {
      this.app = app;
      const getHistory = this.app.modules.history.background.actions.getHistory;
      this.historySync = new HistorySync(getHistory, this.setState.bind(this));
      this.historySync.start();
      this.news = [];
      this.newsByDomain = {};
      this.app.modules.freshtab.background.actions.getNews().then((result, error) => {
        this.news = result
      });
    });
  }

  render() {
    const BasicApp = this.nav;
    let content;
    const actions = {
      queryCliqz: this.props.queryCliqz || queryCliqz.bind(null, this.app),
      openUrl: this.props.openUrl || openUrl.bind(null, this.app),
      openTab: this.props.openTab || openTab.bind(null, this.app),
      getOpenTabs: this.props.getOpenTabs || getOpenTabs.bind(null, this.app),
      getReminders: this.props.getReminders || getReminders.bind(null, this.app),
    };

    const news = this.news

    if (this.state) {
      actions.loadMore = this.historySync.loadMore.bind(this.historySync);
      content = <BasicApp screenProps={{actions, store: this.state.store || {}, news}} />
    } else {
      content = <Text>Loading</Text>;
    }
    return (
      <View style={styles().container}>
        {content}
      </View>
    )
  }
}


const styles = function () {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: '#FFFFFF'
    },
  });
};
