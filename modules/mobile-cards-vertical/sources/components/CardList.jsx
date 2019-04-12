import React from 'react';
import { FlatList, View } from 'react-native';
import Card from './Card';
import SearchEngineCard from './SearchEngineCard';
import { withCliqz } from '../cliqz';

class CardList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.viewabilityConfig = {
      itemVisiblePercentThreshold: 50, // TODO: to be configured
    };
    this.lastText = '';
    this.lastUrl = '';
  }

  getSelection = (result, url, elementName) => {
    const props = this.props;
    const meta = props.meta;
    const selection = {
      action: 'click',
      elementName,
      isFromAutoCompletedUrl: false,
      isNewTab: false,
      isPrivateMode: false,
      isPrivateResult: meta.isPrivate,
      query: result.text,
      rawResult: {
        index: props.index,
        ...result,
      },
      resultOrder: meta.resultOrder,
      url,
    };
    return selection;
  }

  openLink = (result, url, elementName = '') => {
    const selection = this.getSelection(result, url, elementName);
    this.props.cliqz.mobileCards.openLink(url, selection);
  }

  getComponent = ({ item, index }) => {
    let Component;
    switch (item.type) {
      case 'supplementary-search':
        Component = SearchEngineCard;
        break;
      default:
        Component = Card;
    }
    return (
      <Component
        key={item.meta.domain}
        openLink={(...args) => this.openLink(item, ...args)}
        result={item}
        index={index}
      />
    );
  }

  onViewableItemsChanged = ({ viewableItems: [{ item } = {}] }) => {
    if (!item) {
      // TODO: check logic when no items viewed
      return;
    }
    const { friendlyUrl, text } = item;
    if (friendlyUrl !== this.lastUrl || text !== this.lastText) {
      this.props.cliqz.mobileCards.handleAutocompletion(friendlyUrl, text);
      this.lastUrl = friendlyUrl;
      this.lastText = text;
    }
  }

  componentDidUpdate() {
    if (!this._cardsList) {
      return;
    }
    this._cardsList.scrollToIndex({ index: 0 });
  }

  componentWillUnmount() {
    this._cardsList = null;
  }

  render() {
    const { results, cliqz } = this.props;
    if (!results.length) {
      return null;
    }
    return (
      <FlatList
        ref={(cardsList) => { this._cardsList = cardsList; }}
        data={results}
        keyExtractor={item => item.url}
        renderItem={this.getComponent}
        ItemSeparatorComponent={() => <View style={{ marginTop: 16 }} />}
        ListHeaderComponent={() => <View style={{ marginTop: 16 }} />}
        ListFooterComponent={() => <View style={{ marginTop: 16 }} />}
        onTouchStart={() => cliqz.mobileCards.hideKeyboard()}
        onScrollEndDrag={() => cliqz.search.reportHighlight()}
        viewabilityConfig={this.viewabilityConfig}
        onViewableItemsChanged={this.onViewableItemsChanged}
        listKey="cards"
      />
    );
  }
}

export default withCliqz(CardList);
