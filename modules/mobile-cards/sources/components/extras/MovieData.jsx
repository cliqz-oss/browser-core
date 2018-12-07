import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import Link from '../Link';
import Rating from '../partials/Rating';
import { elementSideMargins } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  container: {
    marginTop: 5,
    ...elementSideMargins,
  },
  director: {
    color: themeDetails[theme].movieData.txtColor
  }
});

export default class MobieData extends React.Component {
  displayRating(rating) {
    if (!rating) {
      return null;
    }
    return <Rating image={rating.img} />;
  }

  displayDirector(director) {
    const theme = this.props.theme;
    if (!director || !director.info) {
      return null;
    }
    return (
      <Link label="director-link" url={director.info.url}>
        <View>
          <Text style={styles(theme).director}>
            {`${director.title}: ${director.info.name}`}
          </Text>
        </View>
      </Link>
    );
  }

  render() {
    const data = this.props.data;
    const theme = this.props.theme;
    const richData = data.rich_data || {};
    const rating = richData.rating;
    const director = richData.director;
    return (
      <View style={styles(theme).container}>
        <View
          accessible={false}
          accessibilityLabel="movie-rating"
        >
          {this.displayRating(rating)}
        </View>
        <View
          accessible={false}
          accessibilityLabel="movie-director"
        >
          { this.displayDirector(director) }
        </View>
      </View>
    );
  }
}
