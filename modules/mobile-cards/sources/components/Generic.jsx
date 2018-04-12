import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from './partials/Icon';
import Url from './partials/Url';
import Title from './partials/Title';
import Description from './partials/Description';
import MainImage from './partials/MainImage';
import HistoryUrls from './partials/HistoryUrls';
import deepResultsList, { headersMap, footersMap, extrasMap } from '../helpers/templates-map';
import { agoLine } from '../helpers/logic';
import { elementSidePaddings, cardBorderTopRadius } from '../styles/CardStyle';
import utils from '../../core/utils';

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
    const url = result.url || null;
    const title = result.title || null;
    const timestamp = result.data.extra && result.data.extra.rich_data
                && result.data.extra.rich_data.discovery_timestamp;
    const description = result.description || null;
    const headerDeepResults = this.getDeepResultsList(headersMap, result.data.deepResults);
    const footerDeepResults = this.getDeepResultsList(footersMap, result.data.deepResults);
    const extraComponent = this.getExtraComponent(result.data);
    const urlDetails = utils.getDetailsFromUrl(url || '');
    const logoDetails = utils.getLogoDetails(urlDetails);
    const headerBackround = logoDetails.backgroundColor || '000';
    const isHistory = result.data.kind[0] === 'H';

    return (
      <View style={{ backgroundColor: 'white', ...cardBorderTopRadius }}>
        { url &&
          <View style={styles(`#${headerBackround}`).header}>
            <Icon width={40} height={40} logoDetails={logoDetails} />
            <Url url={url} color="white" isHistory={isHistory} />
          </View>
        }
        { url && title && <Title title={title} isHistory={isHistory} meta={agoLine(timestamp)} /> }
        { result.data.extra && <MainImage extra={result.data.extra} /> }
        { headerDeepResults }
        { extraComponent }
        { description && <Description isHistory={isHistory} description={description} /> }
        { result.data.urls && <HistoryUrls urls={result.data.urls} /> }
        { footerDeepResults }
      </View>
    )
  }
}

const styles = backgroundColor => StyleSheet.create({
  header: {
    backgroundColor,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    ...elementSidePaddings,
    paddingTop: 5,
    paddingBottom: 5,
  },
});

export default Generic;
