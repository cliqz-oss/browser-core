import React from 'react';
import { StyleSheet, View, Text, Dimensions, ScrollView } from 'react-native';
import Carousel from '../../platform/components/Carousel';
import Card from './Card';
import SearchEngineCard from './SearchEngineCard';
import { getVPWidth, getCardWidth } from '../styles/CardStyle';
import { openLink } from '../../platform/browser-actions';
import handleAutoCompletion from '../../platform/auto-completion';
import sendTelemetry from '../../platform/cards-telemetry';

const INITIAL_PAGE_INDEX = 0;
const MAX_ORGANIC_RESULTS = 3;

class CardList extends React.Component {

  constructor(props) {
    super(props);
    this.resetTelemetryParams();
    this.state = {
      vp: {
        width: getVPWidth(),
      }
    };
  }

  resetTelemetryParams() {
    this.cardViews = { 0: 1 }
    this.cardShowTs = Date.now();
    this.lastCardIndex = INITIAL_PAGE_INDEX;
  }

  componentWillReceiveProps() {
    this.resetTelemetryParams();
  }
  
  sendResultsRenderedTelemetry(nResults) {
    sendTelemetry({
      type: 'cards',
      action: 'results_rendered',
      nResults: nResults,
    });
  }

  sendSwipeTelemetry(selectedResult, index, nCards) {
    if (this.lastCardIndex === index) {
      return; // automatic swipe to initial index
    }
    const direction = this.lastCardIndex > index ? 'left' : 'right';
    const resultKind = (selectedResult.data.kind || []);
    const msg = {
      type: 'cards',
      action: `swipe_${direction}`,
      index,
      show_count: this.cardViews[index],
      show_duration: Date.now() - this.cardShowTs,
      card_count: nCards,
      position_type: resultKind,
    }
    sendTelemetry(msg);
    this.lastCardIndex = index;
  }

  autocomplete({ val, query, searchString }) {
    handleAutoCompletion(val, query || searchString);
  }

  handleSwipe(index) {
    // handleswipe will be called before rendering
    // when snapping back to the initial visible page
    setTimeout(() => {
      this.cardViews[index] = (this.cardViews[index] || 0) + 1;
      if (this._carousel) {
        const selectedResult = this._carousel._getCustomData()[index];
        this.autocomplete(selectedResult);
        this.sendSwipeTelemetry(selectedResult, index, this._carousel._getCustomDataLength());
      }
    }, 0);
  }

  filterResults(results = []) {
    // filter history results
    const historyResultsCount = results.reduce((count, result) => {
      if (result.data.kind.includes('H') || result.data.kind.includes('C')) {
        return count + 1;
      }
      return count;
    }, 0);
    return (
      results
        .filter(result => !result.extra || !result.extra.is_ad) // filter offers
        .filter((result, index) => index < historyResultsCount + MAX_ORGANIC_RESULTS)
    );
  }

  componentWillUpdate(nextProps, nextState) {
    const isRotation = nextState.vp.width !== this.state.vp.width;
    const carousel = this._carousel;
    if (!carousel) {
      return;
    }
    if (!isRotation) {
      carousel.snapToItem(INITIAL_PAGE_INDEX);
    }
  }

  renderItem({ item: result, index }) {
    if (result.isSearch) {
      return (
        <SearchEngineCard
          index={index}
          result={result}
          noResults={!Boolean(index)}
          width={getCardWidth()}
        />
      );
    }
    return (
      <Card
        index={index}
        width={getCardWidth()}
        result={result}
        openLink={openLink}
      />
    );
  }

  render() {
    const result = this.props.result;
    const openLink = this.props.openLink || openLink;
    if (!result) return null;

    const resultList = this.filterResults(result._results);

    const searchResult = {
      searchString: result._searchString,
      isSearch: true,
      data: {
        kind: ['default_search'],
      }
    };

    return (
      <Carousel
        onLayout={() => {
          const width = getVPWidth();
          if (width !== this.state.vp.width) {
            this.setState({
              vp: {
                width: getVPWidth(),
              }
            });
          }
        }}
        ref={(c) => { this._carousel = c; }}
        data={resultList.concat(searchResult)}
        renderItem={this.renderItem}
        sliderWidth={this.state.vp.width}
        itemWidth={getCardWidth()}
        onSnapToItem={this.handleSwipe.bind(this)}
      />
    )
  }

  componentDidUpdate() {
    const carousel = this._carousel;
    if (!carousel) {
      return;
    }
    this.autocomplete(carousel._getCustomData()[INITIAL_PAGE_INDEX]);
    this.sendResultsRenderedTelemetry(carousel._getCustomDataLength() - 1);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CardList;