import React from 'react';
import { StyleSheet, TouchableHighlight, Image, View, Text } from 'react-native';
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
    const thumbnail = (link.extra && link.extra.thumbnail)
          || 'https://cdn.cliqz.com/extension/EZ/news/no-image-mobile.png'; 
    const nLines = 3;
    return <TouchableHighlight key={link.url}>
      <View style={styles.item}>
        <Image
          source={{uri: thumbnail}}
          style={styles.image} />
        <View style={styles.body}>
          <Text style={styles.text} numberOfLines={nLines}>{link.title}</Text>
        </View>
      </View>
    </TouchableHighlight>
  }
}


const styles = StyleSheet.create({
  item: {
    flex: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 5,
  },
  image: {
    flex: 1,
    height: 50,
  },
  body: {
    flex: 2
  },
  text: {
    color: 'black'
  },
});