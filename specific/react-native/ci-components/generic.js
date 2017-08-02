import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Icon from './icon';
import Url from '../components/partials/Url';
import Title from '../components/partials/Title';
import Description from '../components/partials/Description';


class Generic extends React.Component {

  render() {
    const result = this.props.result;
    // get friendly url
    const url = result.url;
    const title = result.title;
    const description = result.description;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon borderRadius={2} url={url} />
          <Url url={url} />
        </View>
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
    containter: {
      flexGrow: 1,
      flexDirection: 'column',
    },
    header: {
      marginLeft: 10,
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      marginTop: 15,
      marginLeft: 10,
      marginBottom: 12,
      marginRight: 1,
      color: 'black',
      fontWeight: 'bold',
      fontSize: 15
    },
    description: {
      marginLeft: 10
    }
  });

export default Generic;
