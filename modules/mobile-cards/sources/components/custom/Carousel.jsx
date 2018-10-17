import React from 'react';
import { View } from 'react-native';
import TouchCarousel from 'react-touch-carousel';
import cx from 'classnames';
import { getVPWidth } from '../../styles/CardStyle';
import { window } from '../../../platform/globals';

const CARD_MARGIN = 10;

export default class Carousel extends React.Component {
  constructor(props) {
    super(props);
    this.handleLayoutChange = () => window.setTimeout(this.props.onLayout, 100);
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleLayoutChange);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleLayoutChange);
  }

  _CarouselContainer = (carouselProps) => {
    const { cursor, carouselState: { active, dragging }, ...rest } = carouselProps;
    const data = this.props.data || [];
    const cardSize = this.props.itemWidth + (CARD_MARGIN * 2);
    const carouselWidth = getVPWidth();
    let current = -Math.round(cursor) % data.length;
    while (current < 0) {
      current += data.length;
    }
    // Put current card at center
    const translateX = (cursor * cardSize) + ((carouselWidth - cardSize) / 2);

    return (
      <div
        className={cx(
          'carousel-container',
          {
            'is-active': active,
            'is-dragging': dragging
          }
        )}
      >
        <div
          className="carousel-track"
          style={{ transform: `translate3d(${translateX}px, 0, 0)` }}
          {...rest}
        />
      </div>
    );
  }

  get currentIndex() {
    if (this._carousel) {
      return this._carousel.state.cursor;
    }
    return this.props.initialPage;
  }

  snapToItem(index) {
    if (this._carousel) {
      this._carousel.go(index);
    }
  }

  renderCard(index, modIndex) {
    const data = this.props.data || [];
    return (
      <View key={data[modIndex].url} style={{ marginLeft: CARD_MARGIN, marginRight: CARD_MARGIN }}>
        { this.props.renderItem({ item: data[modIndex], index }) }
      </View>
    );
  }

  render() {
    const data = this.props.data || [];
    return (
      <TouchCarousel
        ref={(c) => { this._carousel = c; }}
        component={this._CarouselContainer}
        cardCount={data.length}
        cardSize={this.props.itemWidth + CARD_MARGIN}
        renderCard={(...args) => this.renderCard(...args)}
        loop={false}
        onRest={this.props.onSnapToItem}
      />
    );
  }
}
