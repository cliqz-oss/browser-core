import React from 'react';
import { AppRegistry, StyleSheet, View } from 'react-native';

import startup from './modules/platform/startup';
import components from './components';

// set app global for debugging
startup.then((app) => {
  global.app = app;
});

console.disableYellowBox = true

const styles = function () {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      paddingTop: 20,
      backgroundColor: '#FFFFFF'
    },
  });
};

// wrapper for a component to add top padding on iOS
function AppContainer(App) {
  return () => (
    <View style={styles().container}>
      <App />
    </View>
  );
}

// register components from config
Object.keys(components).forEach((component) => {
  AppRegistry.registerComponent(component, () => AppContainer(components[component]));
});
