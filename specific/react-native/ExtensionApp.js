import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import startup from './modules/platform/startup';

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
});

export default class extends React.Component {

  constructor(props) {
    super(props);
    this.state = { modules: [] };
  }

  componentDidMount() {
    startup.then((app) => {
      this.app = app;
      global.app = app;
      const modules = this.app.moduleList.map((m) => ({
        name: m.name,
        isEnabled: m.isEnabled,
        loadingTime: m.loadingTime,
      }));
      this.setState({ modules });
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to Cliqz Mobile Native!!!!!
        </Text>
        {this.state.modules.map(mod => <Text key={mod.name}>{mod.name}, {mod.loadingTime}</Text>)}
      </View>
    );
  }

}
