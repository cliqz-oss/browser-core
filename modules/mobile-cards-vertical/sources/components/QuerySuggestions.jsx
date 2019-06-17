import React from 'react';
import { View, FlatList, StyleSheet, Text, Dimensions, Keyboard } from 'react-native';
import Link from './Link';
import { withCliqz } from '../cliqz';

const LIMIT = 3;
const SEPARATOR_WIDTH = 1;
const ORIENTATION_HORIZONTAL = 'horizontal';
const ORIENTATION_VERTICAL = 'vertical';
const KEYBOARD_OPEN = 'open';
const KEYBOARD_CLOSED = 'closed';
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    height: 30,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EEEEEE',
    paddingTop: 5,
    paddingBottom: 5,
  },
  item: {
    paddingLeft: 5,
    paddingRight: 5,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  text: {
    color: 'black',
    fontSize: 15,
  }
});

class QuerySuggestions extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      orientation: this.orientation,
    };
  }

  get orientation() {
    const { width, height } = Dimensions.get('screen');
    return width > height ? ORIENTATION_HORIZONTAL : ORIENTATION_VERTICAL;
  }

  updateOrientation = () => this.setState({ orientation: this.orientation });

  componentDidMount() {
    Dimensions.addEventListener('change', this.updateOrientation);
    this.keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => this.setState({ keyboard: KEYBOARD_OPEN }),
    );
    this.keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => this.setState({ keyboard: KEYBOARD_CLOSED }),
    );
  }

  componentWillUnmount() {
    Dimensions.removeEventListener('change', this.updateOrientation);
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  getSeparatorComponent() {
    return (
      <View style={{ backgroundColor: '#888888', width: SEPARATOR_WIDTH }} />
    );
  }

  renderItem(query, text, width) {
    let queryChunk = '';
    let suggestion = text;
    if (text.startsWith(query)) {
      queryChunk = query;
      suggestion = text.substring(query.length);
    }
    return (
      // eslint-disable-next-line jsx-a11y/anchor-is-valid
      <Link action="queryCliqz" param={text}>
        <View key={text} style={[styles.item, { width }]}>
          <Text numberOfLines={1} ellipsizeMode="head" style={styles.text}>
            {queryChunk}
            <Text style={{ fontWeight: 'bold' }}>
              {suggestion}
            </Text>
          </Text>
        </View>
      </Link>
    );
  }

  render() {
    const { orientation, keyboard } = this.state;
    const suggestions = this.props.suggestions.slice(0, LIMIT);
    const query = this.props.query;
    const length = suggestions.length;
    if (!length || orientation === ORIENTATION_HORIZONTAL || keyboard === KEYBOARD_CLOSED) {
      return null;
    }
    const { width } = Dimensions.get('window');
    const separatorTotalWidth = (length - 1) * SEPARATOR_WIDTH;
    const itemWidth = (width - separatorTotalWidth) / length;
    return (
      <View style={styles.container}>
        <FlatList
          data={suggestions}
          renderItem={({ item }) => this.renderItem(query, item, itemWidth)}
          keyExtractor={item => item}
          horizontal
          ItemSeparatorComponent={this.getSeparatorComponent}
        />
      </View>
    );
  }
}

export default withCliqz(QuerySuggestions);
