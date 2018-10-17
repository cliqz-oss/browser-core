import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';
import Link from '../Link';
import ExpandView from '../ExpandView';
import Local from './Local';

// trigger with query: cadillac verdana kino
// make sure results are set to germany

const styles = StyleSheet.create({
  header: {
    color: 'black',
    marginBottom: 5,
    ...elementTopMargin,
    ...elementSideMargins,
    fontSize: 15,
  },
  title: {
    color: '#0C2B4A',
    fontSize: 14,
  },
  text: {
    color: 'black',
  },
  showContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  show: {
    padding: 3,
    marginRight: 10,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 5,
  },
});

export default class Cinema extends React.Component {
  displayShow(show) {
    return (
      <Link label="movie-showtime-link" url={show.booking_link} key={show.booking_link}>
        <View style={styles.show}>
          <Text style={styles.text}>{ show.start_at.substr(11, 5) }</Text>
        </View>
      </Link>
    );
  }

  displayMovie(movie, index) {
    const key = `${movie.title}${index}`;
    const content = (
      <View style={styles.showContainer}>
        { movie.showtimes.map(this.displayShow) }
      </View>
    );
    const header = <Text style={styles.title}>{ movie.title }</Text>;
    return (
      <ExpandView key={key} index={index} header={header} content={content} />
    );
  }

  render() {
    const data = this.props.data.data || {};
    const showsToday = data.showdates[0] || {};
    const movieList = showsToday.movie_list || [];
    if (movieList.length === 0) {
      return null;
    }
    return (
      <View
        accessible={false}
        accessibilityLabel={'cinema'}
      >
        <Local data={data.cinema} />
        <View
          accessible={false}
          accessibilityLabel={'cinema-showtimes'}
        >
          <Text style={styles.header}>
            { getMessage('cinema_movie_showtimes') }
            <Text style={styles.text}>: { (showsToday.date || '').toUpperCase() }</Text>
          </Text>
        </View>
        { movieList.map((...args) => this.displayMovie(...args)) }
      </View>
    );
  }
}
