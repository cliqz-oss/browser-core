import React from 'react';
import { View, StyleSheet } from 'react-native';
import Snippet from './partials/Snippet';
import SnippetList from './partials/SnippetList';
import { withStyles } from '../withTheme';
import { cardSidePadding } from '../themes';

const SUPPORTED_DEEP_RESULTS = ['streaming', 'simple_links', 'buttons'];

const cardStyle = (theme, themeDetails) => StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingBottom: 5,
    paddingLeft: cardSidePadding,
    paddingRight: cardSidePadding,
    backgroundColor: themeDetails[theme].card.bgColor,
    borderRadius: 9,
    marginLeft: 10,
    marginRight: 10,
  },
});

function getDeepResults(deepResults, mainUrl, openLink) {
  return deepResults.map(result => (
    <SnippetList
      key={mainUrl + result.type}
      listKey={mainUrl + result.type}
      limit={3}
      expandStep={5}
      list={result.links.map(link => (
        <Snippet
          key={link.url}
          openLink={openLink}
          data={link}
          type={result.type}
        />
      ))}
    />));
}

function getHistoryResults(urls, mainUrl, openLink) {
  if (!urls.length) {
    return null;
  }
  return (
    <SnippetList
      listKey={`${mainUrl}history`}
      limit={3}
      expandStep={5}
      list={urls.map(url => (
        <Snippet
          key={url.url}
          openLink={openLink}
          data={url}
          type="history"
        />
      ))}
    />
  );
}

const Card = ({ result, classes, openLink }) => {
  const url = result.url;
  const urls = result.data.urls || [];
  const deepResults = (result.data.deepResults || [])
    .filter(dr => SUPPORTED_DEEP_RESULTS.includes(dr.type));
  const logo = result.meta.logo;
  return (
    <View style={classes.container}>
      <Snippet openLink={openLink} data={result} type="main" logo={logo} />
      { getHistoryResults(urls, url, openLink) }
      { getDeepResults(deepResults, url, openLink) }
    </View>
  );
};

export default withStyles(cardStyle)(Card);
