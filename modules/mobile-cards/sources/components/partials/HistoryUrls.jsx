import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Link from '../Link';
import Icon from './Icon';
import Url from './Url';
import Title from './Title';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';


export default class extends React.Component {

  render() {
    if (!this.props.urls || !this.props.urls.length) {
      return null;
    }
    // some urls are not http urls
    const urls = this.props.urls.filter(data => data.href.startsWith('http'));
    return <View style={styles.container}>
      <Text style={styles.title}>{'History Results'}</Text>
      {urls.map(this.displayUrls)}
    </View>
  }

  displayUrls(data) {
    return (
      <Link to={data.href} key={data.extra}>
        <View style={styles.row}>
          <View style={styles.header}>
            <Icon width={34} height={34} logoDetails={data.logo} />
            <Url url={data.link} isHistory={true} />
          </View>
          <Text style={styles.text}>{data.title}</Text>
        </View>
      </Link>
    )
  }
}


const styles = StyleSheet.create({
  container: {
    ...elementTopMargin,
  },
  title: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 15,
    ...elementSideMargins,
    paddingTop: 6,
    paddingBottom: 6,
  },
  text: {
    color: 'black',
    ...elementSideMargins,
    marginTop: 10,
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: '#EDECEC',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    ...elementSideMargins,
  },
});
