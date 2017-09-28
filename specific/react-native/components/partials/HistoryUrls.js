import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Link from '../Link';
import Icon from './Icon';
import Url from './Url';
import Title from './Title';


export default class extends React.Component {
  
  render() {
    if (!this.props.urls || !this.props.urls.length) {
      return null;
    }
    // some urls are not http urls
    const urls = this.props.urls.filter(data => data.href.startsWith('http'));
    return <View>
      <Title title='History Results' />
      {urls.map(this.displayUrls)}
    </View>
  }

  displayUrls(data) {
    return (
      <Link to={data.href} key={data.extra}>
        <View style={styles.row}>
          <View style={styles.header}>
            <Icon logoDetails={data.logo} />
            <Url url={data.link} isHistory={true} />
          </View>
          <Title title={data.title} />
        </View>
      </Link>
    )
  }
}


const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#EDECEC',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    marginTop: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#000000'
  }
});