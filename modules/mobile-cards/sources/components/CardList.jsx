import React from 'react';
import Carousel from '../../platform/components/Carousel';
import Card from './Card';
import SearchEngineCard from './SearchEngineCard';
import { getVPWidth, getCardWidth } from '../styles/CardStyle';
import handleAutoCompletion from '../../platform/auto-completion';
import { withCliqz } from '../cliqz';

const INITIAL_PAGE_INDEX = 0;

class CardList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      vp: {
        width: getVPWidth(),
        isForceSnapping: false,
      }
    };
  }

  componentWillReceiveProps(nextProps) {
    const carousel = this._carousel;
    if (!carousel) {
      return;
    }
    if (carousel.currentIndex !== INITIAL_PAGE_INDEX
      && nextProps.results[0].text !== this.props.results[0].text) {
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
    this.autocomplete(this.props.results[INITIAL_PAGE_INDEX]);
  }

  autocomplete({ url, text }) {
    handleAutoCompletion(url, text);
  }

  handleSwipe(index) {
    if (this.state.isForceSnapping) {
      // no swipe telemetry when force snapping
      this.setState({ isForceSnapping: false });
      return;
    }
    if (this._carousel) {
      const selectedResult = this.props.results[index] || {};
      this.autocomplete(selectedResult);
      this.props.cliqz.search.reportHighlight({ contextId: 'mobile-cards' });
    }
  }

  renderItem(result, index, { length }) {
    if (result.type === 'supplementary-search') {
      return (
        <SearchEngineCard
          index={index}
          result={result}
          noResults={length < 2}
          width={getCardWidth()}
        />
      );
    }
    return (
      <Card
        index={index}
        width={getCardWidth()}
        result={result}
      />
    );
  }

  render() {
    const results = this.props.results;
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
        data={results}
        renderItem={({ item: result, index }) => this.renderItem(result, index, results)}
        sliderWidth={this.state.vp.width}
        itemWidth={getCardWidth()}
        onSnapToItem={index => this.handleSwipe(index)}
        initialPage={INITIAL_PAGE_INDEX}
      />
    );
  }
}

export default withCliqz(CardList);
