'use strict';

import React from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ListView,
} from 'react-native';

import startup from './modules/platform/startup';

class ExtensionApp extends React.Component {

  constructor(props) {
    super(props);
    console.log('construct');
    this.state = {modules: []};
  }

  componentDidMount() {
    startup.then((app) => {
      this.app = app;
      setTimeout(() => {
        const modules = this.app.modules().map((m) => {
            return {
              name: m.name,
              isEnabled: m.isEnabled,
              loadingTime: m.loadingTime,
            }
          });
        this.setState({ modules })
      }, 1000)
    });
  }

  render() {
    // setPref('test', 'hi')
    const mods = this.state.modules.map(mod => <Text key={mod.name}>{mod.name}, {mod.loadingTime}</Text>)
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to CLIQZ Mobile Native!!!!!
        </Text>
        {mods}
      </View>
    );
  }

  _renderRow(mod) {
    const text = `${mod.name}, enabled: ${mod.isEnabled} (${mod.loadingTime})`
    return (
      <Text>{text}</Text>
    )
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

// Module name
AppRegistry.registerComponent('ExtensionApp', () => ExtensionApp);
