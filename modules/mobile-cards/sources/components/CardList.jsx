import React from 'react';
import { StyleSheet, View, Text, Dimensions, ScrollView } from 'react-native';
import Carousel from '../../platform/components/Carousel';
import Card from './Card';
import SearchEngineCard from './SearchEngineCard';
import { getVPWidth, getCardWidth } from '../styles/CardStyle';
import { openLink } from '../../platform/browser-actions';
import { handleAutoCompletion } from '../../platform/auto-completion';

const INITIAL_PAGE_INDEX = 0;
const MAX_ORGANIC_RESULTS = 3;

class CardList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      vp: {
        width: getVPWidth(),
      }
    };
  }

  componentDidUpdate() {
    setTimeout(() => {
      this.handleSwipe(INITIAL_PAGE_INDEX);
    }, 0);
  }

  componentWillReceiveProps() {
    this._carousel && this._carousel.snapToItem(INITIAL_PAGE_INDEX);
  }

  handleSwipe(index) {
    if (this._carousel) {
      const selectedResult = this._carousel._getCustomData()[index];
      handleAutoCompletion(selectedResult.val, selectedResult.query);
    }
  }

  filterResults(results = []) {
    // filter history results
    const historyResultsCount = results.reduce((count, result) => {
      if (result.data.kind.includes('H') || result.data.kind.includes('C')) {
        return count + 1;
      }
      return count;
    }, 0);
    return results.filter((result, index) => index < historyResultsCount + MAX_ORGANIC_RESULTS);
  }

  render() {
    const result = this.props.result;
    const openLink = this.props.openLink || openLink;
    if (!result) return null;

    const resultList = this.filterResults(result._results);

    const searchResult = {
      searchString: result._searchString,
    };

    const renderItem = ({ item: result, index }) => {
      if (result.searchString) {
        return (
          <SearchEngineCard
            noResults={!Boolean(index)}
            width={getCardWidth()}
            query={result.searchString}
          />
        );
      }
      return (
        <Card
          index={index}
          style={styles.card}
          width={getCardWidth()}
          result={result}
          openLink={openLink}
        />
      );
    }

    return (
      <Carousel
        onLayout={() => {
          this.setState({
            vp: {
              width: getVPWidth(),
            }
          });
        }}
        ref={(c) => { this._carousel = c; }}
        data={resultList.concat(searchResult)}
        renderItem={renderItem}
        sliderWidth={this.state.vp.width}
        itemWidth={getCardWidth()}
        onSnapToItem={this.handleSwipe.bind(this)}
      />
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CardList;