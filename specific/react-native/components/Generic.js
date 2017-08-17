import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Icon from './partials/Icon';
import Url from './partials/Url';
import Title from './partials/Title';
import Description from './partials/Description';


class Generic extends React.Component {

  render() {
    const result = this.props.result;
    // get friendly url
    const url = result.val;
    const title = result.data.title;
    const description = result.data.description;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon url={url} />
          <Url url={url} />
        </View>
        <Title title={title} />
        <Description description={description} />
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
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

export default Generic;