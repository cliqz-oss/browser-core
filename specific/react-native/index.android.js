import React from 'react';
import { AppRegistry, StyleSheet, View, DeviceEventEmitter } from 'react-native';
import App from './modules/core/app';
import inject from './modules/core/kord/inject';
import CardList from './components/CardList';
import events from './modules/core/events';

const app = new App();
app.start();
global.app = app;

class SearchUI extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      result: null,
    };
    this.autocomplete = inject.module('autocomplete');
    events.sub('search', (...args) => this.searchResults(...args));
  }

  componentDidMount() {
  }

  searchResults(query) {
    this.setState({ result: null });
    this.autocomplete.action('search', query, (result) => {
      console.log('result', result)
      this.setState({result})
    }).then(console.log.bind(console)).catch((err) => {
      console.error(err)
    })
  }

  render() {
    console.log('render')
    return (
      <View style={styles().container}>
        <CardList result={this.state.result} />
      </View>
    );
  }
}

const styles = function () {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
    },
  });
};

// Module name
AppRegistry.registerComponent('ExtensionApp', () => SearchUI);
