import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from './partials/Icon';
import Url from './partials/Url';
import Title from './partials/Title';
import Description from './partials/Description';
import MainImage from './partials/MainImage';
import HistoryUrls from './partials/HistoryUrls';
import deepResultsList, { headersMap, contentsMap, footersMap, extrasMap } from '../helpers/templates-map';
import { agoLine } from '../helpers/logic';
import {
  elementSidePaddings,
  cardBorderTopRadius,
} from '../styles/CardStyle';
import NativeDrawable, { normalizeUrl } from './custom/NativeDrawable';
import themeDetails from '../themes';

const styles = theme => StyleSheet.create({
  header: {
    backgroundColor: themeDetails[theme].card.headerBgColor,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomWidth: themeDetails[theme].card.headerBorder,
    borderBottomColor: themeDetails[theme].separatorColor,
    flexDirection: 'row',
    alignItems: 'center',
    ...elementSidePaddings,
    paddingTop: 2,
    paddingBottom: 2,
    height: 30,
  },
  lock: {
    width: 11,
    height: 11,
    marginLeft: 5,
    marginRight: 5,
  },
  separator: {
    borderBottomWidth: 1.5,
    borderBottomColor: themeDetails[theme].separatorColor
  }
});

class Generic extends React.Component {
  getDeepResultsList(map, { deepResults, template }) {
    return (deepResults || []).filter(res => map[res.type])
      .sort((res1, res2) => deepResultsList.indexOf(res1.type) > deepResultsList.indexOf(res2.type))
      .map((res) => {
        const Component = map[res.type];
        return (
          <Component
            url={this.props.result.url}
            key={res.type}
            data={res.links}
            theme={this.props.theme}
            template={template}
          />
        );
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
    return <Component data={data.extra} result={this.props.result} theme={this.props.theme} />;
  }

  render() {
    const result = this.props.result;
    const data = result.data;
    const theme = this.props.theme;
    const isSecure = (result.url || '').startsWith('https');
    const url = result.friendlyUrl || result.url || null;
    const title = result.title || null;
    const timestamp = data.extra && data.extra.rich_data
                && data.extra.rich_data.discovery_timestamp;
    const description = result.description || null;
    const headerDeepResults = this.getDeepResultsList(headersMap, data);
    const contentDeepResults = this.getDeepResultsList(contentsMap, data);
    const footerDeepResults = this.getDeepResultsList(footersMap, data);
    const extraComponent = this.getExtraComponent(data);
    const logoDetails = result.meta.logo || {};
    const isHistory = data.kind.includes('H') || data.kind.includes('C');
    const historyUrls = data.urls || [];

    return (
      <View
        accessible={false}
        accessibilityLabel="mobile-result"
        style={{ ...cardBorderTopRadius, paddingBottom: 10 }}
      >
        {url && url !== 'undefined'
          && (
            <View
              accessible={false}
              accessibilityLabel="header-container"
              style={styles(theme).header}
            >
              <Icon width={22} height={22} logoDetails={logoDetails} />
              {isSecure
                && (
                  <View
                    accessibilityLabel="https-lock"
                    accessible={false}
                  >
                    <NativeDrawable
                      style={styles(theme).lock}
                      source={normalizeUrl('https_lock.svg')}
                      color={theme === 'dark' ? '#FFFFFF' : '#000000'}
                    />
                  </View>
                )
              }
              <Url url={url} isHistory={isHistory} theme={theme} />
            </View>
          )
        }
        {data.extra && <MainImage extra={data.extra} theme={theme} />}
        {headerDeepResults}
        { title
          && (
            <Title
              title={title}
              isHistory={isHistory}
              meta={agoLine(timestamp)}
              theme={theme}
            />
          )
        }
        {contentDeepResults}
        {extraComponent}
        {<HistoryUrls template={result.template} urls={historyUrls} theme={theme} />}
        {
          description
          && historyUrls.length > 0
          && (
            <View
              style={styles(theme).separator}
            />
          )
        }
        {
          description
          && (
            <Description
              isHistory={isHistory}
              description={description}
              theme={theme}
            />
          )
        }
        {footerDeepResults}
      </View>
    );
  }
}

export default Generic;
