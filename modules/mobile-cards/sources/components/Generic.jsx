import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from './partials/Icon';
import Url from './partials/Url';
import Title from './partials/Title';
import Description from './partials/Description';
import MainImage from './partials/MainImage';
import HistoryUrls from './partials/HistoryUrls';
import deepResultsList, { headersMap, footersMap, extrasMap } from '../templates-map';
import { elementSideMargins } from '../styles/CardStyle';

class Generic extends React.Component {

  getDeepResultsList(map, list) {
    return (list || []).filter(res => map[res.type])
      .sort((res1, res2) => deepResultsList.indexOf(res1.type) > deepResultsList.indexOf(res2.type))
      .map(res => {
        const Component = map[res.type];
        return <Component url={this.props.result.val} key={res.type} data={res.links} />;
      });
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
    const timestamp = result.data.extra && result.data.extra.rich_data
                && result.data.extra.rich_data.discovery_timestamp;
    const description = result.data.description || null;
    const headerDeepResults = this.getDeepResultsList(headersMap, result.data.deepResults);
    const footerDeepResults = this.getDeepResultsList(footersMap, result.data.deepResults);
    const extraComponent = this.getExtraComponent(result.data);

    return (
      <View>
        { url &&
          <View style={styles.header}>
            <Icon width={40} height={40} borderRadius={8} url={url} />
            <Url url={url} isHistory={result.data.kind[0] === 'H'} />
          </View>
        }
        { url && title && <Title title={title} /> }
        { result.data.extra && <MainImage extra={result.data.extra} /> }
        { headerDeepResults }
        { extraComponent }
        { description && <Description description={description} /> }
        { result.data.urls && <HistoryUrls urls={result.data.urls} /> }
        { footerDeepResults }
      </View>
    )
  }
}

const styles = StyleSheet.create({
  header: {
    ...elementSideMargins,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default Generic;
