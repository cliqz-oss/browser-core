import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';
import Link from '../Link';
import ExpandView from '../ExpandView';
import Local from './Local';
import themeDetails from '../../themes';

// trigger with query: cadillac verdana kino
// make sure results are set to germany

const styles = theme => StyleSheet.create({
  header: {
    color: themeDetails[theme].textColor,
    marginBottom: 5,
    ...elementTopMargin,
    ...elementSideMargins,
    fontSize: 15,
  },
  title: {
    color: themeDetails[theme].cinema.movieTxtColor,
    fontSize: 14,
  },
  text: {
    color: themeDetails[theme].textColor,
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
    backgroundColor: themeDetails[theme].cinema.showBgColor,
    borderRadius: 5,
  },
});

export default class Cinema extends React.Component {
  displayShow(show, theme) {
    return (
      <Link label="movie-showtime-link" url={show.booking_link} key={show.booking_link}>
        <View style={styles(theme).show}>
          <Text style={styles(theme).text}>{ show.start_at.substr(11, 5) }</Text>
        </View>
      </Link>
    );
  }

  displayMovie(movie, index) {
    const theme = this.props.theme;
    const key = `${movie.title}${index}`;
    const content = (
      <View style={styles(theme).showContainer}>
        { movie.showtimes.map(show => this.displayShow(show, theme)) }
      </View>
    );
    const header = <Text style={styles(theme).title}>{ movie.title }</Text>;
    return (
      <ExpandView key={key} index={index} header={header} content={content} theme={theme} />
    );
  }

  render() {
    const data = this.props.data.data || {};
    const theme = this.props.theme;
    const showsToday = data.showdates[0] || {};
    const movieList = showsToday.movie_list || [];
    if (movieList.length === 0) {
      return null;
    }
    return (
      <View
        accessible={false}
        accessibilityLabel="cinema"
      >
        <Local data={data.cinema} theme={theme} />
        <View
          accessible={false}
          accessibilityLabel="cinema-showtimes"
        >
          <Text style={styles(theme).header}>
            { getMessage('cinema_movie_showtimes') }
            <Text style={styles(theme).text}>
              {`: ${(showsToday.date || '').toUpperCase()}`}
            </Text>
          </Text>
        </View>
        { movieList.map((...args) => this.displayMovie(...args)) }
      </View>
    );
  }
}
