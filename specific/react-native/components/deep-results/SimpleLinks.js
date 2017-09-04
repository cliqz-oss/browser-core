import React from 'react';
import { StyleSheet, TouchableHighlight, Text, View } from 'react-native';


export default class extends React.Component {
  
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return <View>
      {this.props.data.slice(0, 3).map(this.displayLink)}
    </View>
  }

  displayLink(link) {
    return <TouchableHighlight style={styles.row} key={link.url}>
      <Text style={styles.text}>{link.title}</Text>
    </TouchableHighlight>
  }
}


const styles = StyleSheet.create({
  row: {
    borderTopWidth: 1,
    borderTopColor: '#EDECEC',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    marginTop: 5,
  },
  text: {
    color: '#000000'
  }
});