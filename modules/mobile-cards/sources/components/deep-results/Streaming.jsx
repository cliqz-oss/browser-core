import React from 'react';
import { StyleSheet, View } from 'react-native';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import Link from '../Link';

const styles = StyleSheet.create({
  streaming: {
    flex: 1,
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    flexDirection: 'row',
    marginTop: 5,
  },
  image: {
    margin: 5,
    width: 60,
    height: 20,
  }
});

export default class Streaming extends React.Component {
  displayLink(link) {
    const imageName = normalizeUrl(link.image);
    return (
      <Link url={link.url} key={link.url}>
        <NativeDrawable
          source={imageName}
          style={styles.image}
        />
      </Link>
    );
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return (
      <View style={styles.streaming}>
        {this.props.data.slice(0, 3).map(this.displayLink)}
      </View>
    );
  }
}
