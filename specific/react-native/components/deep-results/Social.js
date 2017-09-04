import React from 'react';
import { StyleSheet, TouchableHighlight, Image, View } from 'react-native';
import Icon from '../partials/Icon';


export default class extends React.Component {
  
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return <View style={styles.social} >
      {this.props.data.slice(0, 3).map(this.displayLink)}
    </View>
  }

  displayLink(link) {
    return <TouchableHighlight key={link.url}>
      {/*this should be an image*/}
      <View>
        <Icon
          url={link.url}
          style={styles.image} />
      </View>
    </TouchableHighlight>
  }
}


const styles = StyleSheet.create({
  social: {
    flex: 1,
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    flexDirection: 'row',
    marginTop: 5,
  },
  image: {
    margin: 5,
    width: 20,
    height: 20,
  }
});