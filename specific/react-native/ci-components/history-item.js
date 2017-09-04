import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight, Image } from 'react-native';

import Icon from './icon';
import moment from 'moment';


export default class extends React.Component {

  render() {
    const data = this.props.data;
    // we should use the logo details
    const actions = this.props.actions;
    const arrowImg = require('../images/Arrow.png')
    return (
      <TouchableHighlight
        onPress={this.props.onPress}
      >
        <View style={styles.container} >
          <Icon url={data.domain} baseUrl={data.baseUrl} actions={actions}/>
          <View style={{marginLeft: 12}}>
            <Text style={{fontSize:18}}>{data.domain}</Text>
            <Text style={{fontSize:14, color: '#AAAAAA', marginTop: 2}}>{moment(data.data.lastVisitedAt / 1000).fromNow()}</Text>
          </View>
          <View style={{flex: 1, flexDirection: 'column', alignItems: 'flex-end', paddingRight: 10,}} >
            <Image style={{width:30, height:40,}} source={arrowImg} />
          </View>
        </View>
      </TouchableHighlight>
    )
  }
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 10,
      height: 74,
      borderBottomWidth: 1,
      borderBottomColor: '#E6E6E6',
      borderStyle: 'solid'
    },
    text: {
      color: '#000000',
    },
  });
