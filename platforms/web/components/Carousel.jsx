import React from 'react';
import { View } from 'react-native';
import TouchCarousel from 'react-touch-carousel';
import touchWithMouseHOC from 'react-touch-carousel/lib/touchWithMouseHOC';
import cx from 'classnames';
import { getVPWidth } from '../../mobile-cards/styles/CardStyle';

const CARD_MARGIN = 10;

export default class Carousel extends React.Component {
  _CarouselContainer(props) {
    const { cursor, carouselState: { active, dragging }, ...rest } = props;
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


  renderCard(index, modIndex) {
    const data = this.props.data || [];
    return (
      <View key={index} style={{ marginLeft: CARD_MARGIN, marginRight: CARD_MARGIN }}>
        { this.props.renderItem({ item: data[modIndex] }) }
      </View>
    );
  }

  render() {
    const data = this.props.data || [];
    const Container = touchWithMouseHOC((...args) => this._CarouselContainer(...args));
    return (
      <TouchCarousel
        component={Container}
        cardCount={data.length}
        cardSize={this.props.itemWidth + CARD_MARGIN}
        renderCard={(...args) => this.renderCard(...args)}
        loop={false}
      />
    );
  }
}
