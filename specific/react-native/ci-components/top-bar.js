import React from 'react';
import events from '../modules/core/events';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import ImageButton from './image-button';

export default class  extends React.Component {

  constructor(props) {
    super(props);
    events.subscribe('browser:home-pressed', _ => {
      this.props.navigation.goBack();
    });
  }

  render() {
    const navigateTo = this.props.navigateTo;
    const preNavigate = this.props.preNavigate || Promise.resolve();
    const navigation = this.props.navigation;
    var image = require('../images/Home.png')
    var size = 21;
    if (navigateTo === "Dashboard") {
      image = require('../images/Tab_Overview.png');
      size = 25;
    }

    return <View style={styles.container}>
      <Text style={styles.cliqz} onPress={this.props.queryCliqz.bind(null, navigation, '')}>Search</Text>
      <ImageButton
        style={styles.home}
        size={size}
        appearance={{normal: image, highlight: image}}
        onPress={() => preNavigate.then(data => {
          if (navigateTo === "Home") {
            navigation.goBack()
          }
          else {
            navigation.navigate(navigateTo, data)
          }
        })}
      />
    </View>
  }
}

var styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E6',
    borderStyle: 'solid'
  },
  cliqz: {
    flex: 1,
    alignSelf: 'flex-start',
    color: '#909090',
    fontSize: 15,
    paddingTop: 14,
    paddingLeft: 20,
    paddingLeft: 20,
    paddingBottom: 11
  },
  home: {
    marginTop: 0,
    marginRight: 0,
    width: 40,
    height: 40
  }
});
