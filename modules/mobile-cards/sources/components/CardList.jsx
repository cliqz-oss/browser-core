import React from 'react';
import Carousel from '../../platform/components/Carousel';
import Card from './Card';
import SearchEngineCard from './SearchEngineCard';
import { getVPWidth, getCardWidth } from '../styles/CardStyle';
import { openLink } from '../../platform/browser-actions';
import handleAutoCompletion from '../../platform/auto-completion';
import inject from '../../core/kord/inject';

const anolysis = inject.module('anolysis');

const INITIAL_PAGE_INDEX = 0;
const MAX_ORGANIC_RESULTS = 3;

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.resetTelemetryParams();
    this.state = {
      vp: {
        width: getVPWidth(),
        isForceSnapping: false,
      }
    };
  }

  componentWillReceiveProps(nextProps) {
    this.resetTelemetryParams();
    const carousel = this._carousel;
    if (!carousel) {
      return;
    }
    if (carousel.currentIndex !== INITIAL_PAGE_INDEX
      && nextProps.result._results.length) {
      // only snap to first item when we need to
      carousel.snapToItem(INITIAL_PAGE_INDEX);
      this.setState({ isForceSnapping: true });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    /*
    don't update cards until force snapping
    back to first card is finished
    */
    return !nextState.isForceSnapping;
  }

  componentDidUpdate() {
    const carousel = this._carousel;
    if (!carousel) {
      return;
    }
    this.autocomplete(carousel._getCustomData()[INITIAL_PAGE_INDEX]);
    this.sendResultsRenderedTelemetry(carousel._getCustomDataLength() - 1);
  }

  sendSwipeTelemetry(selectedResult, index, nCards) {
    if (this.lastCardIndex === index) {
      return; // automatic swipe to initial index
    }
    const direction = this.lastCardIndex > index ? 'left' : 'right';
    const resultKind = (selectedResult.data.kind || []);
    const msg = {
      type: 'cards',
      swipe_direction: direction,
      index,
      show_count: this.cardViews[index],
      show_duration: Date.now() - this.cardShowTs,
      card_count: nCards,
      position_type: resultKind,
    };
    anolysis.action('handleTelemetrySignal', msg, 'mobile_swipe');
  }

  autocomplete({ val, query, searchString }) {
    handleAutoCompletion(val, query || searchString);
  }

  handleSwipe(index) {
    if (this.state.isForceSnapping) {
      // no swipe telemetry when force snapping
      this.setState({ isForceSnapping: false });
      return;
    }
    this.cardViews[index] = (this.cardViews[index] || 0) + 1;
    if (this._carousel) {
      const selectedResult = this._carousel._getCustomData()[index];
      this.autocomplete(selectedResult);
      this.sendSwipeTelemetry(selectedResult, index, this._carousel._getCustomDataLength());
      this.cardShowTs = Date.now();
      this.lastCardIndex = index;
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
    return (
      results
        .filter(result => !result.extra || !result.extra.is_ad) // filter offers
        .filter((result, index) => index < historyResultsCount + MAX_ORGANIC_RESULTS)
    );
  }

  sendResultsRenderedTelemetry(nResults) {
    const msg = {
      result_count: nResults,
    };
    anolysis.action('handleTelemetrySignal', msg, 'mobile_results_rendered');
  }

  resetTelemetryParams() {
    this.cardViews = { 0: 1 };
    this.cardShowTs = Date.now();
    this.lastCardIndex = INITIAL_PAGE_INDEX;
  }

  renderItem({ item: result, index }) {
    if (result.isSearch) {
      return (
        <SearchEngineCard
          index={index}
          result={result}
          noResults={!index}
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
        onSnapToItem={index => this.handleSwipe(index)}
      />
    );
  }
}
