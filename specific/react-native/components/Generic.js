import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';
import Icon from './partials/Icon';
import Url from './partials/Url';
import Title from './partials/Title';
import Description from './partials/Description';
import MainImage from './partials/MainImage';
import HistoryUrls from './partials/HistoryUrls';
import Link from './Link';
import { headersMap, footersMap, extrasMap } from '../modules/platform/templates-map';


class Generic extends React.Component {

  getDeepResultComponent(map, data) {
    const Component = map[data.type];
    return <Component key={data.type} data={data.links} />;
  }

  getExtraComponent(data) {
    if (!data.extra) {
      return null;
    }
    const Component = extrasMap[data.template] || extrasMap[data.extra.superTemplate];
    if (!Component) {
      return null;
    }
    return <Component key='extra' data={data.extra} />;
  }

  render() {
    const result = this.props.result;
    // get friendly url
    const url = result.val || null;
    const title = result.data.title || null;
    const description = result.data.description || null;
    const headerDeepResults = (result.data.deepResults || [])
      .filter(res => headersMap[res.type])
      .map(res => this.getDeepResultComponent(headersMap, res));
    const footerDeepResults = (result.data.deepResults || [])
      .filter(res => footersMap[res.type])
      .map(res => this.getDeepResultComponent(footersMap, res));
    const extraComponent = this.getExtraComponent(result.data);
    // TODO: move link inside of component
    return (
      <View style={styles.container}>
        { url && 
          <View style={styles.header}>
            <Icon width={40} height={40} borderRadius={8} url={url} />
            <Url url={url} isHistory={result.data.kind[0] === 'H'} />
          </View>
        }
        { url && title && <Title title={title} /> } 
        { result.data.extra && <MainImage extra={result.data.extra} /> }
        { extraComponent }
        { headerDeepResults }
        { description && <Description description={description} /> }
        { result.data.urls && <HistoryUrls urls={result.data.urls} /> }
        { footerDeepResults }
      </View>
    )
  }
}

const styles = StyleSheet.create({
    containter: {
      flexDirection: 'column',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

export default Generic;
